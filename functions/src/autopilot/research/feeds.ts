import { XMLParser } from "fast-xml-parser";

export interface FeedItem {
    title: string;
    link: string;
    publishedAt?: Date;
    summary: string;
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    // Feeds are untrusted: don't expand entities beyond the defaults.
    processEntities: true,
    htmlEntities: true,
    trimValues: true,
});

const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);

function text(value: unknown): string {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
        const node = value as Record<string, unknown>;
        if ("#text" in node) return text(node["#text"]);
    }
    return "";
}

const stripTags = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function parseDate(value: string): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function atomLink(links: unknown): string {
    const all = asArray(links as Record<string, string> | Record<string, string>[]);
    const alternate = all.find((l) => !l["@_rel"] || l["@_rel"] === "alternate") ?? all[0];
    return alternate?.["@_href"] ?? "";
}

/** Parse RSS 2.0, RSS 1.0 (RDF) and Atom feeds into a flat item list. Returns [] for unrecognised XML. */
export function parseFeed(xml: string): FeedItem[] {
    let doc: Record<string, any>;
    try {
        doc = parser.parse(xml);
    } catch {
        return [];
    }

    const items: FeedItem[] = [];

    const rssItems = asArray(doc?.rss?.channel?.item ?? doc?.["rdf:RDF"]?.item);
    for (const item of rssItems) {
        const link = text(item.link) || text(item.guid);
        const title = stripTags(text(item.title));
        if (!link || !title) continue;
        items.push({
            title,
            link: link.trim(),
            publishedAt: parseDate(text(item.pubDate) || text(item["dc:date"])),
            summary: stripTags(text(item.description) || text(item["content:encoded"])).slice(0, 500),
        });
    }

    for (const entry of asArray(doc?.feed?.entry)) {
        const link = atomLink(entry.link);
        const title = stripTags(text(entry.title));
        if (!link || !title) continue;
        items.push({
            title,
            link: link.trim(),
            publishedAt: parseDate(text(entry.published) || text(entry.updated)),
            summary: stripTags(text(entry.summary) || text(entry.content)).slice(0, 500),
        });
    }

    return items;
}
