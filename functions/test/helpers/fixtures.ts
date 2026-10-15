// Local fixture web server for research tests: an RSS feed plus article pages on several loopback hosts
// (distinct hosts count as distinct "source sites"). Reachable only because the fetcher's test-only
// loopback allowance (RESEARCH_ALLOW_LOCALHOST + FUNCTIONS_EMULATOR) is on.
import * as http from "http";
import type { AddressInfo } from "net";

export const HOSTS = ["127.0.0.1", "127.0.0.2", "127.0.0.3", "127.0.0.4"];

const paragraphs = (topic: string) => [
    `${topic} is moving from experiments into real production systems across several large companies this quarter.`,
    "Engineering teams report that careful testing and human review remain essential before anything ships to customers.",
    "Analysts expect adoption to continue as tooling matures and the operational lessons are shared more widely online.",
    "Several vendors have also published guidance on monitoring costs and keeping humans in the loop for risky actions.",
];

const page = (title: string) =>
    `<html><head><title>${title}</title><meta property="og:title" content="${title}"></head><body><nav>Home Pricing Docs Login Blog</nav>` +
    `<article><h1>${title}</h1>${paragraphs(title).map((p) => `<p>${p}</p>`).join("")}</article><footer>Copyright notice that must not be extracted anywhere</footer></body></html>`;

const ON_TOPIC = "A look at AI agents and developer tools for engineering teams.";
export const ARTICLES: Record<string, { host: string; title: string; summary: string }> = {
    "/a1": { host: HOSTS[0], title: "AI agents enter production at large banks", summary: ON_TOPIC },
    "/a2": { host: HOSTS[1], title: "New developer tools make agent testing easier", summary: ON_TOPIC },
    "/a3": { host: HOSTS[2], title: "Open source agent frameworks gain more contributors", summary: ON_TOPIC },
    "/a4": { host: HOSTS[3], title: "Enterprises build guardrails around AI assistants", summary: ON_TOPIC },
    "/pasta": { host: HOSTS[0], title: "Cooking pasta at home for beginners", summary: "Simple recipes for dinner tonight." },
    "/crypto": { host: HOSTS[1], title: "Crypto prices surge as AI agents trade tokens", summary: "Markets moved sharply today." },
};

export async function startFixtures() {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? "/", "http://x");
        if (url.pathname === "/feed.xml") {
            const items = Object.entries(ARTICLES)
                .map(([p, a]) => `<item><title>${a.title}</title><link>http://${a.host}:${(server.address() as AddressInfo).port}${p}?utm_source=feed</link><pubDate>${new Date().toUTCString()}</pubDate><description>${a.summary}</description></item>`)
                .join("");
            res.writeHead(200, { "content-type": "application/rss+xml" });
            return res.end(`<?xml version="1.0"?><rss version="2.0"><channel><title>Fixture</title>${items}</channel></rss>`);
        }
        const article = ARTICLES[url.pathname];
        if (article) {
            res.writeHead(200, { "content-type": "text/html" });
            return res.end(page(article.title));
        }
        res.writeHead(404, { "content-type": "text/html" });
        res.end("not found");
    });
    await new Promise<void>((resolve) => server.listen(0, "::", resolve));
    const port = (server.address() as AddressInfo).port;
    return {
        port,
        at: (host: string, path: string) => `http://${host}:${port}${path}`,
        close: async () => {
            server.closeAllConnections?.();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        },
    };
}
