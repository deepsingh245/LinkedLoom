import { FieldValue, Timestamp, type DocumentData, type DocumentReference } from "firebase-admin/firestore";
import { assertConnectionUsable } from "../../ai-core/connections-store";
import { runAIGrounded, runAIStructured, type RunContext } from "../../ai-core/execute";
import { GROUNDING_COST_MICRO_USD_PER_QUERY } from "../../ai-core/pricing";
import { DEFAULT_MANAGED_PROVIDER } from "../../ai-core/registry";
import { errorMessage } from "../../ai-core/redact";
import type { ProviderId } from "../../ai-core/types";
import { workspaceRef } from "../workspace";
import { readArtifact, writeArtifact } from "./artifacts";
import { canonicalUrl, domainOf, fingerprint, isNearDuplicate, jaccard, titleTokens, urlId } from "./dedupe";
import { classifyError, StopRun } from "./errors";
import { extractArticle, MIN_ARTICLE_CHARS } from "./extract";
import { parseFeed } from "./feeds";
import {
    checkPrompt, checkSchema, draftPrompt, draftSchema, extractPrompt, extractSchema, type PersonaVoice,
} from "./prompts";
import { isFresh, mentionsExcluded, MIN_RELEVANCE, relevanceScore, type Candidate } from "./relevance";
import { safeFetch } from "./safe-fetch";
import {
    MAX_AI_CALLS_PER_RUN, RESEARCH_LIMITS,
    type ContentClaim, type ContentSource, type Rejection, type RunStats,
} from "./types";
import { qualityScore, quoteInText, verifyDeterministic } from "./verify";
import { approveContentInternal } from "../approval/approve";

/**
 * The research pipeline as resumable steps. Each step:
 *   - reads the previous step's output from run artifacts,
 *   - writes its own output (and checkpoints inside the step before every paid AI call result is lost),
 *   - assigns (not increments) the stats it owns, so running a step twice never double-counts.
 * `processStep` in steps.ts handles locking, cancellation, retries and queuing the next step.
 */

// ------------------------------------------------------------------ serialisable artifact shapes
export interface SCandidate {
    url: string;
    title: string;
    summary: string;
    publishedAtMs?: number;
    origin: "feed" | "search";
}

export interface DocArtifact {
    id: string;
    url: string;
    canonical: string;
    domain: string;
    title: string;
    text: string;
    publishedAtMs?: number;
    relevance: number;
    claims: Array<{ claim: string; quote: string }>;
}

export interface DraftArtifact {
    topic: string;
    post: string;
    hashtags: string[];
    groupIds: string[];
    citedIds: string[];
}

export interface AcceptedArtifact {
    topic: string;
    post: string;
    hashtags: string[];
    citedIds: string[];
    claims: ContentClaim[];
    checked: number;
    supported: number;
}

export interface VerifyArtifact {
    next: number;
    accepted: AcceptedArtifact[];
    rejections: Rejection[];
}

interface ShortlistArtifact {
    items: SCandidate[];
    duplicates: number;
}

interface DocsArtifact {
    extracted: boolean;
    docs: DocArtifact[];
    duplicates?: number;
}

export interface StepOutcome {
    state: "done" | "skipped" | "failed";
    note?: string;
}

export interface ResearchConfig {
    topics: string[];
    keywords: string[];
    excludedTopics: string[];
    feedUrls: string[];
    freshnessHours: number;
    minSourceCount: number;
    webSearch?: boolean;
}

export interface StepCtx {
    workspaceId: string;
    uid: string;
    runId: string;
    runRef: DocumentReference;
    personaId: string;
    persona: DocumentData;
    research: ResearchConfig;
    voice: PersonaVoice;
    stats: RunStats;
    notes: string[];
    rejections: Rejection[];
    startedAtMs: number;
    addNote(message: string): void;
    /** Persist stats/notes/rejections and mark progress (feeds the stuck-run reaper). */
    flush(): Promise<void>;
    /** Throws StopRun when the run's AI-call or time budget is used up. */
    guard(): void;
    afterAI(credits: number): Promise<void>;
    aiCtx(feature: string, key: string): RunContext;
}

export function buildStepCtx(input: {
    workspaceId: string;
    uid: string;
    runId: string;
    runRef: DocumentReference;
    personaId: string;
    persona: DocumentData;
    stats: RunStats;
    notes: string[];
    rejections: Rejection[];
    startedAtMs: number;
}): StepCtx {
    const { persona } = input;
    const research = persona.research as ResearchConfig;
    const ctx: StepCtx = {
        ...input,
        research,
        voice: {
            role: persona.identity.role,
            targetAudience: persona.identity.targetAudience,
            tone: persona.identity.tone,
            language: persona.identity.language,
            customInstructions: persona.identity.customInstructions,
            excludedTopics: research.excludedTopics,
        },
        addNote(message) {
            if (!ctx.notes.includes(message)) ctx.notes.push(message);
        },
        flush: () =>
            input.runRef
                .update({
                    stats: ctx.stats,
                    notes: ctx.notes,
                    rejections: ctx.rejections,
                    updatedAt: FieldValue.serverTimestamp(),
                    lastProgressAt: FieldValue.serverTimestamp(),
                })
                .then(() => undefined),
        guard() {
            if (ctx.stats.aiCalls >= MAX_AI_CALLS_PER_RUN) throw new StopRun("AI call limit for this run reached.");
            if (Date.now() - ctx.startedAtMs > RESEARCH_LIMITS.runDeadlineMs) throw new StopRun("Run time limit reached.");
        },
        async afterAI(credits) {
            ctx.stats.aiCalls += 1;
            ctx.stats.credits += credits;
            await ctx.flush();
        },
        aiCtx: (feature, key) => ({
            workspaceId: input.workspaceId,
            uid: input.uid,
            feature: `autopilot.research.${feature}`,
            personaId: input.personaId,
            connectionId: persona.ai.connectionId,
            modelProfile: persona.ai.modelProfile,
            chargeCredits: true,
            personaMonthlyLimit: persona.ai.monthlyCreditLimit,
            idempotencyKey: `${input.runId}:${key}`,
        }),
    };
    return ctx;
}

// ------------------------------------------------------------------ helpers
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

async function providerFor(ctx: StepCtx): Promise<ProviderId> {
    if (ctx.persona.ai.connectionId) return (await assertConnectionUsable(ctx.workspaceId, ctx.persona.ai.connectionId)).provider;
    return DEFAULT_MANAGED_PROVIDER;
}

const toCandidate = (c: SCandidate): Candidate => ({ ...c, publishedAt: c.publishedAtMs ? new Date(c.publishedAtMs) : undefined });
const dateOf = (ms?: number) => (ms ? new Date(ms) : undefined);

/** Partition articles into draft groups of `size` distinct-domain sources, most similar first. */
export function groupDocs<T extends { id: string; domain: string; title: string; relevance: number }>(docs: T[], size: number, maxGroups: number): T[][] {
    const remaining = [...docs].sort((a, b) => b.relevance - a.relevance);
    const groups: T[][] = [];
    while (remaining.length && groups.length < maxGroups) {
        const anchor = remaining.shift()!;
        const group = [anchor];
        const anchorTokens = titleTokens(anchor.title);
        const candidates = remaining
            .filter((d) => !group.some((g) => g.domain === d.domain))
            .sort((a, b) => jaccard(titleTokens(b.title), anchorTokens) - jaccard(titleTokens(a.title), anchorTokens) || b.relevance - a.relevance);
        for (const candidate of candidates) {
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

/** A StopRun for "out of credits / our own limits"; anything else keeps its type. */
function stopOrRethrow(error: unknown): never {
    if (classifyError(error) === "stop" && !(error instanceof StopRun)) {
        throw new StopRun(error instanceof Error ? error.message : "Run stopped.");
    }
    throw error;
}

// ------------------------------------------------------------------ 1. DISCOVER
export async function stepDiscover(ctx: StepCtx): Promise<StepOutcome> {
    const { research } = ctx;
    const candidates = new Map<string, SCandidate>();
    let feedsFetched = 0;
    let feedsFailed = 0;

    for (const feedUrl of research.feedUrls) {
        try {
            const res = await safeFetch(feedUrl, { accept: ["xml", "rss", "atom", "text/html", "text/plain"] });
            if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
            feedsFetched++;
            for (const item of parseFeed(res.body).slice(0, RESEARCH_LIMITS.maxFeedItemsPerFeed)) {
                let link: string;
                try {
                    link = new URL(item.link, res.url).toString();
                } catch {
                    continue;
                }
                candidates.set(canonicalUrl(link), {
                    url: link, title: item.title, summary: item.summary, publishedAtMs: item.publishedAt?.getTime(), origin: "feed",
                });
            }
        } catch (error) {
            feedsFailed++;
            ctx.addNote(`Feed skipped (${domainOf(feedUrl) || "invalid URL"}): ${errorMessage(error)}`);
        }
    }

    let searchNote: string | undefined;
    if (research.webSearch) {
        const provider = await providerFor(ctx);
        if (provider !== "gemini") {
            searchNote = "Web search skipped: it needs Gemini.";
            ctx.addNote(searchNote);
        } else {
            for (const [i, topic] of research.topics.slice(0, RESEARCH_LIMITS.maxSearchTopics).entries()) {
                // Checkpoint per topic so a retried step doesn't pay for the same search twice.
                let result = await readArtifact<{ sources: Array<{ url: string; title: string }> }>(ctx.workspaceId, ctx.runId, `search_${i}`);
                if (!result) {
                    try {
                        ctx.guard();
                        const grounded = await runAIGrounded(ctx.aiCtx("search", `search:${i}`), {
                            system: "You research recent news for a LinkedIn writer. Use web search. Prefer reputable primary sources and articles published recently.",
                            prompt: `Find recent articles (last ${research.freshnessHours} hours if possible) about: ${topic}. Summarise the key developments.`,
                            maxOutputTokens: 1024,
                            extraMaxCostMicroUsd: 3 * GROUNDING_COST_MICRO_USD_PER_QUERY,
                        });
                        result = { sources: grounded.sources };
                        await writeArtifact(ctx.workspaceId, ctx.runId, `search_${i}`, result);
                        await ctx.afterAI(grounded.meta.credits);
                    } catch (error) {
                        if (classifyError(error) === "stop") stopOrRethrow(error);
                        ctx.addNote(`Search for “${topic}” failed: ${errorMessage(error)}`);
                        continue;
                    }
                }
                for (const s of result.sources) candidates.set(canonicalUrl(s.url), { url: s.url, title: s.title, summary: "", origin: "search" });
            }
        }
    }

    ctx.stats.feedsFetched = feedsFetched;
    ctx.stats.feedsFailed = feedsFailed;
    ctx.stats.candidates = candidates.size;
    await writeArtifact(ctx.workspaceId, ctx.runId, "candidates", Array.from(candidates.values()));
    await ctx.flush();
    return candidates.size ? { state: "done", note: searchNote } : { state: "skipped", note: "No feeds or search results to read." };
}

// ------------------------------------------------------------------ 2. FILTER
export async function stepFilter(ctx: StepCtx): Promise<StepOutcome> {
    const { research } = ctx;
    const candidates = (await readArtifact<SCandidate[]>(ctx.workspaceId, ctx.runId, "candidates")) ?? [];
    if (!candidates.length) {
        await writeArtifact(ctx.workspaceId, ctx.runId, "shortlist", { items: [], duplicates: 0 } satisfies ShortlistArtifact);
        return { state: "skipped" };
    }

    const known = await loadKnown(ctx.workspaceId);
    let duplicates = 0;
    const scored: Array<{ c: SCandidate; score: number }> = [];
    for (const c of candidates) {
        const canonical = canonicalUrl(c.url);
        if (known.usedUrlIds.has(urlId(canonical))) { duplicates++; continue; }
        if (c.origin === "feed") {
            const cand = toCandidate(c);
            if (mentionsExcluded(`${c.title} ${c.summary}`, research.excludedTopics)) continue;
            if (!isFresh(cand.publishedAt, research.freshnessHours)) continue;
            const score = relevanceScore(cand, research);
            if (score < MIN_RELEVANCE) continue;
            if (isNearDuplicate(c.title, known.fingerprints)) { duplicates++; continue; }
            scored.push({ c, score });
        } else {
            scored.push({ c, score: 0.7 }); // the search engine already matched these to the topic
        }
    }
    scored.sort((a, b) => b.score - a.score || (b.c.publishedAtMs ?? 0) - (a.c.publishedAtMs ?? 0));

    // Same story from several feeds: keep the best one. (Search results often carry only a site name as title.)
    const kept: string[] = [];
    const items: SCandidate[] = [];
    for (const { c } of scored) {
        if (c.origin === "feed") {
            if (kept.some((fp) => jaccard(titleTokens(c.title), fp.split(" ")) >= 0.6)) { duplicates++; continue; }
            kept.push(fingerprint(c.title));
        }
        items.push(c);
        if (items.length >= RESEARCH_LIMITS.maxCandidatesToFetch) break;
    }

    ctx.stats.afterFilter = items.length;
    ctx.stats.duplicates = duplicates;
    await writeArtifact(ctx.workspaceId, ctx.runId, "shortlist", { items, duplicates } satisfies ShortlistArtifact);
    await ctx.flush();
    return items.length ? { state: "done" } : { state: "skipped", note: "Nothing new and relevant was found." };
}

// ------------------------------------------------------------------ 3. FETCH
export async function stepFetch(ctx: StepCtx): Promise<StepOutcome> {
    const { research } = ctx;
    const shortlist = (await readArtifact<ShortlistArtifact>(ctx.workspaceId, ctx.runId, "shortlist")) ?? { items: [], duplicates: 0 };
    if (!shortlist.items.length) {
        await writeArtifact(ctx.workspaceId, ctx.runId, "docs", { extracted: false, docs: [] } satisfies DocsArtifact);
        return { state: "skipped" };
    }

    const known = await loadKnown(ctx.workspaceId);
    let fetchFailed = 0;
    let thinPages = 0;
    let duplicates = shortlist.duplicates;

    const fetched = await pool(shortlist.items, RESEARCH_LIMITS.fetchConcurrency, async (c) => {
        try {
            const res = await safeFetch(c.url);
            if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
            const article = extractArticle(res.body);
            if (article.text.length < MIN_ARTICLE_CHARS) { thinPages++; return null; }
            return { res, article, c };
        } catch (error) {
            fetchFailed++;
            ctx.addNote(`Couldn't read ${domainOf(c.url)}: ${errorMessage(error)}`);
            return null;
        }
    });

    const docs: DocArtifact[] = [];
    const seen = new Set<string>();
    for (const item of fetched) {
        if (!item) continue;
        const canonical = canonicalUrl(item.res.url);
        const title = item.article.title || item.c.title;
        const publishedAtMs = item.article.publishedAt?.getTime() ?? item.c.publishedAtMs;
        if (seen.has(canonical) || known.usedUrlIds.has(urlId(canonical))) { duplicates++; continue; }
        if (item.c.origin === "search") {
            // Search results weren't filtered by title/date yet.
            if (mentionsExcluded(`${title} ${item.article.text.slice(0, 600)}`, research.excludedTopics)) continue;
            if (!isFresh(dateOf(publishedAtMs), research.freshnessHours)) continue;
            if (isNearDuplicate(title, known.fingerprints)) { duplicates++; continue; }
        }
        seen.add(canonical);
        docs.push({
            id: `s${docs.length + 1}`,
            url: item.res.url,
            canonical,
            domain: domainOf(item.res.url),
            title,
            text: item.article.text,
            publishedAtMs,
            relevance: relevanceScore({ title, summary: item.article.text.slice(0, 500) }, research),
            claims: [],
        });
    }

    ctx.stats.fetched = docs.length;
    ctx.stats.fetchFailed = fetchFailed;
    ctx.stats.thinPages = thinPages;
    ctx.stats.duplicates = duplicates;

    let usable = docs;
    let note: string | undefined;
    const domains = new Set(docs.map((d) => d.domain));
    if (docs.length && domains.size < research.minSourceCount) {
        ctx.addNote(`Only ${domains.size} distinct source site(s) were readable; ${research.minSourceCount} required per draft.`);
        usable = [];
    } else if (!docs.length) {
        note = "No readable articles.";
    }
    await writeArtifact(ctx.workspaceId, ctx.runId, "docs", { extracted: false, docs: usable } satisfies DocsArtifact);
    await ctx.flush();
    return docs.length ? { state: "done" } : { state: "failed", note };
}

// ------------------------------------------------------------------ 4. EXTRACT
export async function stepExtract(ctx: StepCtx): Promise<StepOutcome> {
    const stored = (await readArtifact<DocsArtifact>(ctx.workspaceId, ctx.runId, "docs")) ?? { extracted: false, docs: [] };
    if (!stored.docs.length) return { state: "skipped" };
    if (stored.extracted) return { state: "done" }; // a retry after the AI result was saved

    ctx.guard();
    const forPrompt = stored.docs.map((d) => ({ id: d.id, url: d.url, title: d.title, text: d.text.slice(0, RESEARCH_LIMITS.extractCharsPerArticle) }));
    const prompt = extractPrompt(ctx.research.topics, forPrompt);
    const result = await runAIStructured(
        ctx.aiCtx("extract", "extract"),
        { ...prompt, maxOutputTokens: 4096, temperature: 0.1 },
        { name: "research_extract", schema: extractSchema }
    ).catch(stopOrRethrow);

    const docs = stored.docs.map((d) => ({ ...d, claims: [] as DocArtifact["claims"] }));
    for (const article of result.data.articles) {
        const doc = docs.find((d) => d.id === article.id);
        if (!doc) continue;
        doc.relevance = Math.max(doc.relevance, article.relevance);
        // Only claims whose quote really appears in the article survive.
        doc.claims = article.claims.filter((c) => quoteInText(c.quote, doc.text));
    }
    const usable = docs.filter((d) => d.claims.length > 0);
    ctx.stats.claims = usable.reduce((n, d) => n + d.claims.length, 0);
    await writeArtifact(ctx.workspaceId, ctx.runId, "docs", { extracted: true, docs: usable } satisfies DocsArtifact);
    await ctx.afterAI(result.meta.credits);
    return usable.length ? { state: "done" } : { state: "failed", note: "No verifiable claims found in the articles." };
}

// ------------------------------------------------------------------ 5. GENERATE
export async function stepGenerate(ctx: StepCtx): Promise<StepOutcome> {
    const { research } = ctx;
    const stored = (await readArtifact<DocsArtifact>(ctx.workspaceId, ctx.runId, "docs")) ?? { extracted: true, docs: [] };
    const docs = stored.docs.filter((d) => d.claims.length > 0);
    if (docs.length < Math.max(1, research.minSourceCount)) {
        if (ctx.stats.fetched > 0 && !docs.length) ctx.addNote("None of the articles had claims we could verify, so no drafts were written.");
        return { state: "skipped" };
    }

    const groups = groupDocs(docs, research.minSourceCount, RESEARCH_LIMITS.maxDraftsPerRun);
    const drafts = (await readArtifact<DraftArtifact[]>(ctx.workspaceId, ctx.runId, "drafts")) ?? [];

    // Resume after the last draft that was saved; each AI call has its own idempotency key.
    for (let gi = drafts.length; gi < groups.length; gi++) {
        ctx.guard();
        const group = groups[gi];
        const topic = group[0].title;
        const claims = group.flatMap((d) => d.claims.map((c) => ({ sourceId: d.id, ...c })));
        const prompt = draftPrompt(ctx.voice, topic, group, claims);
        const result = await runAIStructured(
            ctx.aiCtx("generate", `gen:${gi}`),
            { ...prompt, maxOutputTokens: 1500, temperature: 0.7 },
            { name: "research_draft", schema: draftSchema }
        ).catch(stopOrRethrow);

        drafts.push({
            topic,
            post: result.data.post.trim(),
            hashtags: result.data.hashtags.map((h) => h.replace(/^#/, "").trim()).filter(Boolean),
            groupIds: group.map((d) => d.id),
            citedIds: group.filter((d) => result.data.sourceIds.includes(d.id)).map((d) => d.id),
        });
        await writeArtifact(ctx.workspaceId, ctx.runId, "drafts", drafts);
        ctx.stats.draftsGenerated = drafts.length;
        await ctx.afterAI(result.meta.credits);
    }
    ctx.stats.draftsGenerated = drafts.length;
    await ctx.flush();
    return drafts.length ? { state: "done" } : { state: "skipped" };
}

// ------------------------------------------------------------------ 6. VERIFY
export async function stepVerify(ctx: StepCtx): Promise<StepOutcome> {
    const { research } = ctx;
    const drafts = (await readArtifact<DraftArtifact[]>(ctx.workspaceId, ctx.runId, "drafts")) ?? [];
    if (!drafts.length) return { state: "skipped" };

    const docs = ((await readArtifact<DocsArtifact>(ctx.workspaceId, ctx.runId, "docs")) ?? { docs: [] }).docs;
    const byId = new Map(docs.map((d) => [d.id, d]));
    const state = (await readArtifact<VerifyArtifact>(ctx.workspaceId, ctx.runId, "verify")) ?? { next: 0, accepted: [], rejections: [] };
    ctx.rejections = state.rejections;

    const save = async () => {
        await writeArtifact(ctx.workspaceId, ctx.runId, "verify", state);
        ctx.rejections = state.rejections;
        ctx.stats.draftsRejected = state.rejections.length;
        ctx.stats.draftsAccepted = state.accepted.length;
        await ctx.flush();
    };

    for (let di = state.next; di < drafts.length; di++) {
        const d = drafts[di];
        const cited = d.citedIds.map((id) => byId.get(id)).filter((x): x is DocArtifact => !!x);
        const det = verifyDeterministic({
            post: d.post,
            hashtags: d.hashtags,
            citedUrls: cited.map((c) => c.url),
            fetchedUrls: docs.map((x) => x.url),
            evidenceTexts: cited.map((c) => c.text),
            excludedTopics: research.excludedTopics,
            minSourceCount: research.minSourceCount,
        });
        if (!det.ok) {
            state.rejections.push({ topic: d.topic, reasons: det.reasons });
            state.next = di + 1;
            await save();
            continue;
        }

        ctx.guard();
        const prompt = checkPrompt(d.post, cited);
        const check = await runAIStructured(
            ctx.aiCtx("verify", `check:${di}`),
            { ...prompt, maxOutputTokens: 2048, temperature: 0 },
            { name: "research_check", schema: checkSchema }
        ).catch(stopOrRethrow);

        // A claim only counts as supported if the checker also quotes the sources verbatim.
        const verdicts = check.data.claims.map((c) => ({
            ok: c.supported && !!c.quote && cited.some((s) => quoteInText(c.quote ?? "", s.text)),
            text: c.text,
        }));
        const unsupported = verdicts.filter((v) => !v.ok);
        if (!verdicts.length || unsupported.length) {
            state.rejections.push({
                topic: d.topic,
                reasons: [!verdicts.length ? "The fact-check returned no claims." : `Unsupported claim: “${unsupported[0].text.slice(0, 120)}”.`],
            });
        } else {
            state.accepted.push({
                topic: d.topic,
                post: d.post,
                hashtags: d.hashtags,
                citedIds: d.citedIds,
                claims: cited.flatMap((s) => s.claims.map((c) => ({ claim: c.claim, quote: c.quote.slice(0, RESEARCH_LIMITS.evidenceQuoteMax), sourceUrl: s.url }))),
                checked: verdicts.length,
                supported: verdicts.length,
            });
        }
        state.next = di + 1;
        await save();
        await ctx.afterAI(check.meta.credits);
    }
    await save();
    return { state: "done" };
}

// ------------------------------------------------------------------ 7. STORE
/** Opt-in auto-publish: drafts at or above this quality score are scheduled without review. */
export const autoPublishMinQuality = () => {
    const value = Number(process.env.AUTOPILOT_AUTO_PUBLISH_MIN_QUALITY);
    return Number.isFinite(value) && value > 0 ? Math.min(100, value) : 70;
};

/**
 * Schedule high-quality drafts into the next free slots when the persona opted into auto-publish.
 * approveContentInternal re-checks everything live (kill switch, persona still automatic and active,
 * LinkedIn connected), so turning auto-publish off mid-run takes effect. Failures leave drafts for review.
 */
async function autoApprove(ctx: StepCtx, draftIds: string[], scores: Map<string, number>) {
    const min = autoPublishMinQuality();
    let scheduled = 0;
    let below = 0;
    for (const id of draftIds) {
        if ((scores.get(id) ?? 0) < min) {
            below++;
            continue;
        }
        try {
            await approveContentInternal({ workspaceId: ctx.workspaceId, uid: ctx.uid, contentId: id, auto: true });
            scheduled++;
        } catch (error) {
            ctx.addNote(`Auto-publish skipped: ${error instanceof Error ? error.message : "couldn't schedule the draft."} Drafts wait for your review.`);
            break; // the same reason (no slot, LinkedIn, kill switch) applies to the rest
        }
    }
    if (scheduled) ctx.addNote(`Auto-publish scheduled ${scheduled} draft(s) on LinkedIn.`);
    if (below) ctx.addNote(`${below} draft(s) scored below ${min}/100 and wait for your review.`);
}

export interface StoreResult {
    draftIds: string[];
}

/** Writes drafts + dedupe memory. Deterministic ids make a retried store overwrite instead of duplicating. */
export async function stepStore(ctx: StepCtx): Promise<StepOutcome & StoreResult> {
    const { research, workspaceId, runId, persona } = ctx;
    const docs = ((await readArtifact<DocsArtifact>(workspaceId, runId, "docs")) ?? { docs: [] }).docs;
    const verify = (await readArtifact<VerifyArtifact>(workspaceId, runId, "verify")) ?? { next: 0, accepted: [], rejections: [] };
    ctx.rejections = verify.rejections;
    const byId = new Map(docs.map((d) => [d.id, d]));

    const batch = workspaceRef(workspaceId).firestore.batch();
    const usedByUrl = new Map<string, string>();
    const draftIds: string[] = [];
    const scores = new Map<string, number>();

    // A retried store must not reset drafts the user (or auto-publish) already acted on.
    const contentCol = workspaceRef(workspaceId).collection("contentItems");
    const existing = verify.accepted.length ? await contentCol.firestore.getAll(...verify.accepted.map((_, i) => contentCol.doc(`${runId}_${i}`))) : [];
    const handled = new Set(existing.filter((d) => d.exists && d.data()?.approvalStatus !== "pending").map((d) => d.id));

    for (const [i, a] of verify.accepted.entries()) {
        const sourcesDocs = a.citedIds.map((id) => byId.get(id)).filter((x): x is DocArtifact => !!x);
        const id = `${runId}_${i}`;
        const ref = contentCol.doc(id);
        draftIds.push(id);
        if (handled.has(id)) {
            for (const s of sourcesDocs) usedByUrl.set(s.canonical, id);
            continue;
        }
        const newest = sourcesDocs.map((s) => s.publishedAtMs).filter((t): t is number => !!t).sort((x, y) => y - x)[0];
        const sources: ContentSource[] = sourcesDocs.map((s) => ({
            url: s.url,
            title: s.title.slice(0, 200),
            domain: s.domain,
            publishedAt: s.publishedAtMs ? Timestamp.fromMillis(s.publishedAtMs) : null,
            quote: (s.claims[0]?.quote ?? "").slice(0, RESEARCH_LIMITS.evidenceQuoteMax),
        }));
        const score = qualityScore({
            distinctDomains: new Set(sourcesDocs.map((s) => s.domain)).size,
            minSourceCount: research.minSourceCount,
            claimsChecked: a.checked,
            claimsSupported: a.supported,
            newestSourceAgeHours: newest ? Math.max(0, (Date.now() - newest) / 3_600_000) : undefined,
            freshnessHours: research.freshnessHours,
        });
        scores.set(id, score);
        batch.set(ref, {
            id,
            personaId: ctx.personaId,
            runId,
            personaVersion: persona.version,
            topic: a.topic.slice(0, 200),
            tone: String(persona.identity.tone).toUpperCase(),
            masterDraft: a.post,
            hashtags: a.hashtags,
            variants: { linkedin: { text: a.post, status: "draft" } },
            sources,
            claims: a.claims.slice(0, 12),
            fingerprint: fingerprint(a.topic),
            qualityScore: score,
            verification: { deterministic: "passed", ai: "passed", claimsChecked: a.checked },
            state: "PENDING_APPROVAL",
            approvalStatus: "pending",
            version: 1,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        for (const s of sourcesDocs) usedByUrl.set(s.canonical, id);
    }
    ctx.stats.draftsAccepted = verify.accepted.length;
    ctx.stats.draftsRejected = verify.rejections.length;

    // Dedupe memory for the articles we read; expires after 30 days.
    const expireAt = Timestamp.fromMillis(Date.now() + RESEARCH_LIMITS.dedupeWindowDays * 86_400_000);
    for (const d of docs) {
        batch.set(workspaceRef(workspaceId).collection("researchItems").doc(urlId(d.canonical)), {
            url: d.url,
            title: d.title.slice(0, 200),
            domain: d.domain,
            publishedAt: d.publishedAtMs ? Timestamp.fromMillis(d.publishedAtMs) : null,
            fingerprint: fingerprint(d.title),
            relevance: d.relevance,
            ...(usedByUrl.has(d.canonical) ? { usedInContentId: usedByUrl.get(d.canonical) } : {}),
            runId,
            discoveredAt: FieldValue.serverTimestamp(),
            expireAt,
        }, { merge: true });
    }
    await batch.commit();

    const fresh = draftIds.filter((id) => !handled.has(id));
    if (persona.publishing?.approvalMode === "automatic" && fresh.length) await autoApprove(ctx, fresh, scores);

    if (!verify.accepted.length) {
        if (verify.rejections.length) ctx.addNote("Drafts were written but none passed verification.");
        else if (!ctx.notes.length) ctx.addNote("No new, relevant articles were available this time.");
    }
    await ctx.flush();
    return { state: "done", note: `${verify.accepted.length} draft(s) saved.`, draftIds };
}
