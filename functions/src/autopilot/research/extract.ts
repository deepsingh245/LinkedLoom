// Lazy: cheerio is slow to load and only needed when an article is actually parsed.
const loadHtml = (html: string) => (require("cheerio") as typeof import("cheerio")).load(html);

export const MAX_ARTICLE_CHARS = 8000;
/** Pages with less readable text than this are treated as paywalled / JS-only and skipped. */
export const MIN_ARTICLE_CHARS = 300;

export interface ExtractedArticle {
    title: string;
    text: string;
    publishedAt?: Date;
}

const NOISE = "script,style,noscript,template,nav,header,footer,aside,form,iframe,svg,button,[role=navigation],[aria-hidden=true],.advert,.ads,.cookie,.newsletter,.comments";

export const normalizeWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Pull the readable article text out of an HTML page. Deliberately simple: prefers
 * <article>/<main>, keeps paragraph-like blocks, drops boilerplate. Output is capped.
 */
export function extractArticle(html: string): ExtractedArticle {
    const $ = loadHtml(html);
    $(NOISE).remove();

    const title = normalizeWhitespace(
        $("meta[property='og:title']").attr("content") || $("h1").first().text() || $("title").first().text() || ""
    );
    const published =
        $("meta[property='article:published_time']").attr("content") ||
        $("meta[name='date']").attr("content") ||
        $("time[datetime]").first().attr("datetime");

    const root = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
    const blocks: string[] = [];
    root.find("h1,h2,h3,p,li,blockquote").each((_, el) => {
        const t = normalizeWhitespace($(el).text());
        // Skip menu-like crumbs; keep real sentences.
        if (t.length >= 40 || (/^h[1-3]$/i.test(el.tagName) && t.length >= 8)) blocks.push(t);
    });

    let text = blocks.join("\n");
    if (text.length < MIN_ARTICLE_CHARS) text = normalizeWhitespace(root.text());
    const parsed = published ? new Date(published) : undefined;
    return {
        title,
        text: text.slice(0, MAX_ARTICLE_CHARS),
        publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined,
    };
}
