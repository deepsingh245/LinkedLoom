import { FieldValue, Timestamp, type DocumentReference, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { assertConnectionUsable } from "../../ai-core/connections-store";
import { runAIGrounded, runAIStructured, type RunContext } from "../../ai-core/execute";
import { GROUNDING_COST_MICRO_USD_PER_QUERY } from "../../ai-core/pricing";
import { DEFAULT_MANAGED_PROVIDER } from "../../ai-core/registry";
import { errorMessage } from "../../ai-core/redact";
import type { ProviderId } from "../../ai-core/types";
import { workspaceRef } from "../workspace";
import { canonicalUrl, domainOf, fingerprint, isNearDuplicate, jaccard, titleTokens, urlId } from "./dedupe";
import { extractArticle, MIN_ARTICLE_CHARS } from "./extract";
import { parseFeed } from "./feeds";
import {
    checkPrompt, checkSchema, draftPrompt, draftSchema, extractPrompt, extractSchema,
    type PersonaVoice, type SourceDoc,
} from "./prompts";
import { isFresh, mentionsExcluded, MIN_RELEVANCE, relevanceScore, type Candidate } from "./relevance";
import { safeFetch } from "./safe-fetch";
import {
    emptyStats, MAX_AI_CALLS_PER_RUN, RESEARCH_LIMITS,
    type ContentClaim, type ContentSource, type Rejection, type RunStats, type RunStatus, type RunStep, type StepName,
} from "./types";
import { qualityScore, quoteInText, verifyDeterministic } from "./verify";

export interface PipelineInput {
    workspaceId: string;
    uid: string;
    runId: string;
    runRef: DocumentReference;
    personaId: string;
    persona: DocumentData;
    /** Called between steps to extend the run lock and re-check pause / kill switch. */
    heartbeat: () => Promise<void>;
}

export interface PipelineResult {
    status: RunStatus;
    stats: RunStats;
    draftIds: string[];
    rejections: Rejection[];
    notes: string[];
}

interface FetchedDoc extends SourceDoc {
    canonical: string;
    domain: string;
    publishedAt?: Date;
    relevance: number;
    claims: Array<{ claim: string; quote: string }>;
}

/** Stop the run cleanly (not an error) when credits, call budget or time run out. */
class StopRun extends Error {}

const pool = async <T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i]);
        }
    }));
    return results;
};

async function providerFor(workspaceId: string, persona: DocumentData): Promise<ProviderId> {
    if (persona.ai.connectionId) return (await assertConnectionUsable(workspaceId, persona.ai.connectionId)).provider;
    return DEFAULT_MANAGED_PROVIDER;
}

export async function executePipeline(input: PipelineInput): Promise<PipelineResult> {
    const { workspaceId, uid, runId, runRef, personaId, persona } = input;
    const research = persona.research as {
        topics: string[]; keywords: string[]; excludedTopics: string[]; feedUrls: string[];
        freshnessHours: number; minSourceCount: number; webSearch?: boolean;
    };
    const startedAt = Date.now();
    const stats = emptyStats();
    const steps: RunStep[] = [];
    const notes: string[] = [];
    const rejections: Rejection[] = [];
    const draftIds: string[] = [];
    let status: RunStatus = "completed";

    const voice: PersonaVoice = {
        role: persona.identity.role,
        targetAudience: persona.identity.targetAudience,
        tone: persona.identity.tone,
        language: persona.identity.language,
        customInstructions: persona.identity.customInstructions,
        excludedTopics: research.excludedTopics,
    };

    const flush = () => runRef.update({ steps, stats, notes, rejections, updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined);

    const beginStep = async (name: StepName) => {
        await input.heartbeat();
        const step: RunStep = { name, status: "running", startedAt: Date.now() };
        steps.push(step);
        await flush();
        return {
            finish: async (state: "done" | "skipped" | "failed", note?: string) => {
                step.status = state;
                step.finishedAt = Date.now();
                if (note) step.note = note;
                await flush();
            },
        };
    };

    const baseCtx = (feature: string, key: string): RunContext => ({
        workspaceId,
        uid,
        feature: `autopilot.research.${feature}`,
        personaId,
        connectionId: persona.ai.connectionId,
        modelProfile: persona.ai.modelProfile,
        chargeCredits: true,
        personaMonthlyLimit: persona.ai.monthlyCreditLimit,
        idempotencyKey: `${runId}:${key}`,
    });

    /** Every AI call is counted against the run budget and the deadline before it starts. */
    const guard = () => {
        if (stats.aiCalls >= MAX_AI_CALLS_PER_RUN) throw new StopRun("AI call limit for this run reached.");
        if (Date.now() - startedAt > RESEARCH_LIMITS.runDeadlineMs) throw new StopRun("Run time limit reached.");
    };
    const afterAI = (credits: number) => {
        stats.aiCalls += 1;
        stats.credits += credits;
    };
    const asStop = (error: unknown): never => {
        if (error instanceof HttpsError && error.code === "resource-exhausted") throw new StopRun(error.message);
        throw error;
    };

    try {
        // ---------------------------------------------------------------- 1. DISCOVER
        const candidates = new Map<string, Candidate>();
        {
            const step = await beginStep("discover");
            for (const feedUrl of research.feedUrls) {
                try {
                    const res = await safeFetch(feedUrl, { accept: ["xml", "rss", "atom", "text/html", "text/plain"] });
                    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
                    stats.feedsFetched++;
                    for (const item of parseFeed(res.body).slice(0, RESEARCH_LIMITS.maxFeedItemsPerFeed)) {
                        let link: string;
                        try {
                            link = new URL(item.link, res.url).toString();
                        } catch {
                            continue;
                        }
                        candidates.set(canonicalUrl(link), { url: link, title: item.title, summary: item.summary, publishedAt: item.publishedAt, origin: "feed" });
                    }
                } catch (error) {
                    stats.feedsFailed++;
                    notes.push(`Feed skipped (${domainOf(feedUrl) || "invalid URL"}): ${errorMessage(error)}`);
                }
            }

            let searchNote = "";
            if (research.webSearch) {
                const provider = await providerFor(workspaceId, persona);
                if (provider !== "gemini") {
                    searchNote = "Web search skipped: it needs Gemini.";
                    notes.push(searchNote);
                } else {
                    for (const [i, topic] of research.topics.slice(0, RESEARCH_LIMITS.maxSearchTopics).entries()) {
                        try {
                            guard();
                            const result = await runAIGrounded(baseCtx("search", `search:${i}`), {
                                system: "You research recent news for a LinkedIn writer. Use web search. Prefer reputable primary sources and articles published recently.",
                                prompt: `Find recent articles (last ${research.freshnessHours} hours if possible) about: ${topic}. Summarise the key developments.`,
                                maxOutputTokens: 1024,
                                extraMaxCostMicroUsd: 3 * GROUNDING_COST_MICRO_USD_PER_QUERY,
                            });
                            afterAI(result.meta.credits);
                            for (const s of result.sources) {
                                candidates.set(canonicalUrl(s.url), { url: s.url, title: s.title, summary: "", origin: "search" });
                            }
                        } catch (error) {
                            if (error instanceof StopRun) throw error;
                            if (error instanceof HttpsError && error.code === "resource-exhausted") throw new StopRun(error.message);
                            notes.push(`Search for “${topic}” failed: ${errorMessage(error)}`);
                        }
                    }
                }
            }
            stats.candidates = candidates.size;
            await step.finish(candidates.size ? "done" : "skipped", candidates.size ? searchNote || undefined : "No feeds or search results to read.");
        }

        // ---------------------------------------------------------------- 2. FILTER
        const known = await loadKnown(workspaceId);
        const shortlist: Candidate[] = [];
        {
            const step = await beginStep("filter");
            const scored: Array<{ c: Candidate; score: number }> = [];
            for (const [canonical, c] of candidates) {
                if (known.usedUrlIds.has(urlId(canonical))) { stats.duplicates++; continue; }
                if (c.origin === "feed") {
                    if (mentionsExcluded(`${c.title} ${c.summary}`, research.excludedTopics)) continue;
                    if (!isFresh(c.publishedAt, research.freshnessHours)) continue;
                    const score = relevanceScore(c, research);
                    if (score < MIN_RELEVANCE) continue;
                    if (isNearDuplicate(c.title, known.fingerprints)) { stats.duplicates++; continue; }
                    scored.push({ c, score });
                } else {
                    scored.push({ c, score: 0.7 }); // the search engine already matched these to the topic
                }
            }
            scored.sort((a, b) => b.score - a.score || (b.c.publishedAt?.getTime() ?? 0) - (a.c.publishedAt?.getTime() ?? 0));
            // Same story from several feeds: keep the best one.
            const kept: string[] = [];
            for (const { c } of scored) {
                // Search results often carry only a site name as title, so only feed items are compared by title.
                if (c.origin === "feed") {
                    if (kept.some((fp) => jaccard(titleTokens(c.title), fp.split(" ")) >= 0.6)) { stats.duplicates++; continue; }
                    kept.push(fingerprint(c.title));
                }
                shortlist.push(c);
                if (shortlist.length >= RESEARCH_LIMITS.maxCandidatesToFetch) break;
            }
            stats.afterFilter = shortlist.length;
            await step.finish(shortlist.length ? "done" : "skipped", shortlist.length ? undefined : "Nothing new and relevant was found.");
        }

        // ---------------------------------------------------------------- 3. FETCH
        const docs: FetchedDoc[] = [];
        if (shortlist.length) {
            const step = await beginStep("fetch");
            const fetched = await pool(shortlist, RESEARCH_LIMITS.fetchConcurrency, async (c) => {
                try {
                    const res = await safeFetch(c.url);
                    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
                    const article = extractArticle(res.body);
                    if (article.text.length < MIN_ARTICLE_CHARS) { stats.thinPages++; return null; }
                    return { res, article, c };
                } catch (error) {
                    stats.fetchFailed++;
                    notes.push(`Couldn't read ${domainOf(c.url)}: ${errorMessage(error)}`);
                    return null;
                }
            });
            const seen = new Set<string>();
            for (const item of fetched) {
                if (!item) continue;
                const canonical = canonicalUrl(item.res.url);
                const title = item.article.title || item.c.title;
                const publishedAt = item.article.publishedAt ?? item.c.publishedAt;
                if (seen.has(canonical) || known.usedUrlIds.has(urlId(canonical))) { stats.duplicates++; continue; }
                if (item.c.origin === "search") {
                    // Search results weren't filtered by title/date yet.
                    if (mentionsExcluded(`${title} ${item.article.text.slice(0, 600)}`, research.excludedTopics)) continue;
                    if (!isFresh(publishedAt, research.freshnessHours)) continue;
                    if (isNearDuplicate(title, known.fingerprints)) { stats.duplicates++; continue; }
                }
                seen.add(canonical);
                docs.push({
                    id: `s${docs.length + 1}`,
                    url: item.res.url,
                    canonical,
                    domain: domainOf(item.res.url),
                    title,
                    text: item.article.text,
                    publishedAt,
                    relevance: relevanceScore({ title, summary: item.article.text.slice(0, 500) }, research),
                    claims: [],
                });
            }
            stats.fetched = docs.length;
            await step.finish(docs.length ? "done" : "failed", docs.length ? undefined : "No readable articles.");
        }

        const domains = new Set(docs.map((d) => d.domain));
        if (docs.length && domains.size < research.minSourceCount) {
            notes.push(`Only ${domains.size} distinct source site(s) were readable; ${research.minSourceCount} required per draft.`);
            docs.length = 0;
        }

        // ---------------------------------------------------------------- 4. EXTRACT
        if (docs.length) {
            const step = await beginStep("extract");
            try {
                guard();
                const forPrompt = docs.map((d) => ({ id: d.id, url: d.url, title: d.title, text: d.text.slice(0, RESEARCH_LIMITS.extractCharsPerArticle) }));
                const prompt = extractPrompt(research.topics, forPrompt);
                const result = await runAIStructured(baseCtx("extract", "extract"), { ...prompt, maxOutputTokens: 4096, temperature: 0.1 }, { name: "research_extract", schema: extractSchema })
                    .catch(asStop);
                afterAI(result.meta.credits);
                for (const article of result.data.articles) {
                    const doc = docs.find((d) => d.id === article.id);
                    if (!doc) continue;
                    doc.relevance = Math.max(doc.relevance, article.relevance);
                    // Only claims whose quote really appears in the article survive.
                    doc.claims = article.claims.filter((c) => quoteInText(c.quote, doc.text));
                }
                const usable = docs.filter((d) => d.claims.length > 0);
                stats.claims = usable.reduce((n, d) => n + d.claims.length, 0);
                docs.splice(0, docs.length, ...usable);
                await step.finish(usable.length ? "done" : "failed", usable.length ? undefined : "No verifiable claims found in the articles.");
            } catch (error) {
                await step.finish("failed", error instanceof Error ? errorMessage(error) : undefined);
                throw error;
            }
        }

        // ---------------------------------------------------------------- 5. GENERATE + 6. VERIFY
        const accepted: Array<{ topic: string; post: string; hashtags: string[]; sources: FetchedDoc[]; claims: ContentClaim[]; checked: number; supported: number; deterministic: string[] }> = [];
        if (docs.length >= research.minSourceCount) {
            const groups = groupDocs(docs, research.minSourceCount, RESEARCH_LIMITS.maxDraftsPerRun);
            const gen = await beginStep("generate");
            const drafts: Array<{ group: FetchedDoc[]; topic: string; post: string; hashtags: string[]; cited: FetchedDoc[]; claims: ContentClaim[] }> = [];
            try {
                for (const [gi, group] of groups.entries()) {
                    guard();
                    const topic = group[0].title;
                    const claims = group.flatMap((d) => d.claims.map((c) => ({ sourceId: d.id, ...c })));
                    const prompt = draftPrompt(voice, topic, group, claims);
                    const result = await runAIStructured(baseCtx("generate", `gen:${gi}`), { ...prompt, maxOutputTokens: 1500, temperature: 0.7 }, { name: "research_draft", schema: draftSchema })
                        .catch(asStop);
                    afterAI(result.meta.credits);
                    stats.draftsGenerated++;
                    const cited = group.filter((d) => result.data.sourceIds.includes(d.id));
                    drafts.push({
                        group,
                        topic,
                        post: result.data.post.trim(),
                        hashtags: result.data.hashtags.map((h) => h.replace(/^#/, "").trim()).filter(Boolean),
                        cited,
                        claims: cited.flatMap((d) => d.claims.map((c) => ({ claim: c.claim, quote: c.quote.slice(0, RESEARCH_LIMITS.evidenceQuoteMax), sourceUrl: d.url }))),
                    });
                }
                await gen.finish(drafts.length ? "done" : "skipped");
            } catch (error) {
                await gen.finish(drafts.length ? "done" : "failed", error instanceof StopRun ? error.message : undefined);
                if (!(error instanceof StopRun)) throw error;
                notes.push(error.message);
                status = "partial";
            }

            if (drafts.length) {
                const ver = await beginStep("verify");
                try {
                    for (const [di, d] of drafts.entries()) {
                        const det = verifyDeterministic({
                            post: d.post,
                            hashtags: d.hashtags,
                            citedUrls: d.cited.map((c) => c.url),
                            fetchedUrls: docs.map((x) => x.url),
                            evidenceTexts: d.cited.map((c) => c.text),
                            excludedTopics: research.excludedTopics,
                            minSourceCount: research.minSourceCount,
                        });
                        if (!det.ok) {
                            stats.draftsRejected++;
                            rejections.push({ topic: d.topic, reasons: det.reasons });
                            continue;
                        }
                        guard();
                        const prompt = checkPrompt(d.post, d.cited);
                        const check = await runAIStructured(baseCtx("verify", `check:${di}`), { ...prompt, maxOutputTokens: 2048, temperature: 0 }, { name: "research_check", schema: checkSchema })
                            .catch(asStop);
                        afterAI(check.meta.credits);
                        // A claim only counts as supported if the checker also quotes the sources verbatim.
                        const verdicts = check.data.claims.map((c) => ({
                            ok: c.supported && !!c.quote && d.cited.some((s) => quoteInText(c.quote ?? "", s.text)),
                            text: c.text,
                        }));
                        const unsupported = verdicts.filter((v) => !v.ok);
                        if (!verdicts.length || unsupported.length) {
                            stats.draftsRejected++;
                            rejections.push({
                                topic: d.topic,
                                reasons: [!verdicts.length ? "The fact-check returned no claims." : `Unsupported claim: “${unsupported[0].text.slice(0, 120)}”.`],
                            });
                            continue;
                        }
                        accepted.push({
                            topic: d.topic,
                            post: d.post,
                            hashtags: d.hashtags,
                            sources: d.cited,
                            claims: d.claims,
                            checked: verdicts.length,
                            supported: verdicts.length,
                            deterministic: det.reasons,
                        });
                    }
                    await ver.finish("done");
                } catch (error) {
                    await ver.finish("failed", error instanceof StopRun ? error.message : undefined);
                    if (!(error instanceof StopRun)) throw error;
                    notes.push(error.message);
                    status = "partial";
                }
            }
        } else if (!docs.length && stats.fetched > 0) {
            notes.push("None of the articles had claims we could verify, so no drafts were written.");
        }

        // ---------------------------------------------------------------- 7. STORE
        {
            const step = await beginStep("store");
            const batch = workspaceRef(workspaceId).firestore.batch();
            const usedByUrl = new Map<string, string>();
            const personaVersion = persona.version as number;

            for (const a of accepted) {
                const ref = workspaceRef(workspaceId).collection("contentItems").doc();
                draftIds.push(ref.id);
                const newest = a.sources.map((s) => s.publishedAt?.getTime()).filter((t): t is number => !!t).sort((x, y) => y - x)[0];
                const sources: ContentSource[] = a.sources.map((s) => ({
                    url: s.url,
                    title: s.title.slice(0, 200),
                    domain: s.domain,
                    publishedAt: s.publishedAt ? Timestamp.fromDate(s.publishedAt) : null,
                    quote: (s.claims[0]?.quote ?? "").slice(0, RESEARCH_LIMITS.evidenceQuoteMax),
                }));
                batch.set(ref, {
                    id: ref.id,
                    personaId,
                    runId,
                    personaVersion,
                    topic: a.topic.slice(0, 200),
                    tone: String(persona.identity.tone).toUpperCase(),
                    masterDraft: a.post,
                    hashtags: a.hashtags,
                    variants: { linkedin: { text: a.post, status: "draft" } },
                    sources,
                    claims: a.claims.slice(0, 12),
                    fingerprint: fingerprint(a.topic),
                    qualityScore: qualityScore({
                        distinctDomains: new Set(a.sources.map((s) => s.domain)).size,
                        minSourceCount: research.minSourceCount,
                        claimsChecked: a.checked,
                        claimsSupported: a.supported,
                        newestSourceAgeHours: newest ? Math.max(0, (Date.now() - newest) / 3_600_000) : undefined,
                        freshnessHours: research.freshnessHours,
                    }),
                    verification: { deterministic: "passed", ai: "passed", claimsChecked: a.checked },
                    state: "PENDING_APPROVAL",
                    approvalStatus: "pending",
                    version: 1,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                for (const s of a.sources) usedByUrl.set(s.canonical, ref.id);
            }
            stats.draftsAccepted = accepted.length;

            // Dedupe memory for everything we read (used or not); expires after 30 days.
            const expireAt = Timestamp.fromMillis(Date.now() + RESEARCH_LIMITS.dedupeWindowDays * 86_400_000);
            const everything = [...docs, ...accepted.flatMap((a) => a.sources)];
            const written = new Set<string>();
            for (const d of everything) {
                const id = urlId(d.canonical);
                if (written.has(id)) continue;
                written.add(id);
                batch.set(workspaceRef(workspaceId).collection("researchItems").doc(id), {
                    url: d.url,
                    title: d.title.slice(0, 200),
                    domain: d.domain,
                    publishedAt: d.publishedAt ? Timestamp.fromDate(d.publishedAt) : null,
                    fingerprint: fingerprint(d.title),
                    relevance: d.relevance,
                    ...(usedByUrl.has(d.canonical) ? { usedInContentId: usedByUrl.get(d.canonical) } : {}),
                    runId,
                    discoveredAt: FieldValue.serverTimestamp(),
                    expireAt,
                }, { merge: true });
            }
            await batch.commit();
            await step.finish("done", `${accepted.length} draft(s) saved.`);
        }

        if (!accepted.length && status === "completed") {
            if (stats.draftsRejected > 0) notes.push("Drafts were written but none passed verification.");
            else if (!notes.length) notes.push("No new, relevant articles were available this time.");
        }
    } catch (error) {
        if (error instanceof StopRun) {
            notes.push(error.message);
            status = "partial";
            const open = steps.find((s) => s.status === "running");
            if (open) { open.status = "failed"; open.finishedAt = Date.now(); open.note = error.message; }
        } else {
            logger.error("Research run failed", { runId, workspaceId, error: errorMessage(error) });
            const open = steps.find((s) => s.status === "running");
            if (open) { open.status = "failed"; open.finishedAt = Date.now(); open.note = errorMessage(error); }
            notes.push(`Run failed: ${errorMessage(error)}`);
            status = "failed";
        }
    }

    await flush();
    return { status, stats, draftIds, rejections, notes };
}

/** Partition articles into draft groups of `size` distinct-domain sources, most similar first. */
export function groupDocs<T extends { id: string; domain: string; title: string; relevance: number }>(docs: T[], size: number, maxGroups: number): T[][] {
    const remaining = [...docs].sort((a, b) => b.relevance - a.relevance);
    const groups: T[][] = [];
    while (remaining.length && groups.length < maxGroups) {
        const anchor = remaining.shift()!;
        const group = [anchor];
        const anchorTokens = titleTokens(anchor.title);
        const pool = remaining
            .filter((d) => !group.some((g) => g.domain === d.domain))
            .sort((a, b) => jaccard(titleTokens(b.title), anchorTokens) - jaccard(titleTokens(a.title), anchorTokens) || b.relevance - a.relevance);
        for (const candidate of pool) {
            if (group.length >= size) break;
            if (group.some((g) => g.domain === candidate.domain)) continue;
            group.push(candidate);
        }
        if (group.length < size) break; // not enough distinct sources left
        for (const g of group.slice(1)) remaining.splice(remaining.indexOf(g), 1);
        groups.push(group);
    }
    return groups;
}

/** URLs already used in drafts + title fingerprints of recent drafts/articles. */
async function loadKnown(workspaceId: string) {
    const since = Timestamp.fromMillis(Date.now() - RESEARCH_LIMITS.dedupeWindowDays * 86_400_000);
    const ws = workspaceRef(workspaceId);
    const [items, content] = await Promise.all([
        ws.collection("researchItems").where("discoveredAt", ">=", since).orderBy("discoveredAt", "desc").limit(RESEARCH_LIMITS.knownFingerprintLimit).get(),
        ws.collection("contentItems").where("createdAt", ">=", since).orderBy("createdAt", "desc").limit(RESEARCH_LIMITS.knownFingerprintLimit).get(),
    ]);
    const usedUrlIds = new Set<string>();
    const fingerprints: string[] = [];
    for (const doc of items.docs) {
        if (doc.data().usedInContentId) usedUrlIds.add(doc.id);
        if (doc.data().usedInContentId && doc.data().fingerprint) fingerprints.push(doc.data().fingerprint);
    }
    for (const doc of content.docs) {
        // Rejected drafts still count: don't regenerate the same story the user already turned down.
        if (doc.data().fingerprint) fingerprints.push(doc.data().fingerprint);
    }
    return { usedUrlIds, fingerprints };
}
