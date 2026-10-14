// Exercises safeFetch against a real local HTTP server. Loopback is only reachable because the
// test-only escape hatch (RESEARCH_ALLOW_LOCALHOST + FUNCTIONS_EMULATOR) is enabled for this file.
import * as http from "http";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let server: http.Server;
let base: string;
let safeFetch: typeof import("../src/autopilot/research/safe-fetch").safeFetch;
let FetchBlockedError: typeof import("../src/autopilot/research/safe-fetch").FetchBlockedError;
const seenHeaders: http.IncomingHttpHeaders[] = [];

beforeAll(async () => {
    process.env.RESEARCH_ALLOW_LOCALHOST = "true";
    process.env.FUNCTIONS_EMULATOR = "true";
    ({ safeFetch, FetchBlockedError } = await import("../src/autopilot/research/safe-fetch"));

    server = http.createServer((req, res) => {
        seenHeaders.push(req.headers);
        const url = new URL(req.url ?? "/", "http://x");
        switch (url.pathname) {
        case "/ok":
            res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
            return res.end("<html><body>hello</body></html>");
        case "/json":
            res.writeHead(200, { "content-type": "application/json" });
            return res.end("{}");
        case "/big":
            res.writeHead(200, { "content-type": "text/html" });
            return res.end("x".repeat(3 * 1024 * 1024));
        case "/chunked-big": {
            res.writeHead(200, { "content-type": "text/html" });
            const timer = setInterval(() => res.write("y".repeat(64 * 1024)), 1);
            res.on("close", () => clearInterval(timer));
            return;
        }
        case "/redirect-ok":
            res.writeHead(302, { location: "/ok" });
            return res.end();
        case "/redirect-meta":
            res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" });
            return res.end();
        case "/redirect-private":
            res.writeHead(301, { location: "http://10.0.0.5/admin" });
            return res.end();
        case "/redirect-scheme":
            res.writeHead(302, { location: "file:///etc/passwd" });
            return res.end();
        case "/loop":
            res.writeHead(302, { location: "/loop" });
            return res.end();
        case "/slow":
            return; // never answers
        default:
            res.writeHead(404, { "content-type": "text/html" });
            return res.end("nope");
        }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
    delete process.env.RESEARCH_ALLOW_LOCALHOST;
    delete process.env.FUNCTIONS_EMULATOR;
    server?.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("safeFetch against a local server (test mode)", () => {
    it("fetches a page and reports the final URL and status", async () => {
        const res = await safeFetch(`${base}/ok`);
        expect(res.status).toBe(200);
        expect(res.body).toContain("hello");
        expect(res.redirects).toBe(0);
    });

    it("sends an honest user agent and never forwards cookies or auth", async () => {
        seenHeaders.length = 0;
        await safeFetch(`${base}/ok`, { headers: { Cookie: "a=b", Authorization: "Bearer x", "X-Test": "1" } });
        const h = seenHeaders[0];
        expect(h["user-agent"]).toMatch(/LinkedLoomResearch/);
        expect(h.cookie).toBeUndefined();
        expect(h.authorization).toBeUndefined();
        expect(h["x-test"]).toBe("1");
    });

    it("follows safe redirects", async () => {
        const res = await safeFetch(`${base}/redirect-ok`);
        expect(res.redirects).toBe(1);
        expect(res.body).toContain("hello");
    });

    it("blocks redirects to metadata, private and non-http(s) targets", async () => {
        for (const path of ["/redirect-meta", "/redirect-private", "/redirect-scheme"]) {
            await expect(safeFetch(`${base}${path}`)).rejects.toBeInstanceOf(FetchBlockedError);
        }
    });

    it("stops redirect loops", async () => {
        await expect(safeFetch(`${base}/loop`)).rejects.toBeInstanceOf(FetchBlockedError);
    });

    it("rejects disallowed content types", async () => {
        await expect(safeFetch(`${base}/json`)).rejects.toBeInstanceOf(FetchBlockedError);
    });

    it("enforces the size cap via content-length and while streaming", async () => {
        await expect(safeFetch(`${base}/big`, { maxBytes: 1024 * 1024 })).rejects.toBeInstanceOf(FetchBlockedError);
        await expect(safeFetch(`${base}/chunked-big`, { maxBytes: 256 * 1024, timeoutMs: 5000 })).rejects.toBeInstanceOf(FetchBlockedError);
    });

    it("times out slow servers", async () => {
        const started = Date.now();
        await expect(safeFetch(`${base}/slow`, { timeoutMs: 400 })).rejects.toThrow(/timed out/i);
        expect(Date.now() - started).toBeLessThan(3000);
    });

    it("returns non-2xx responses to the caller to handle", async () => {
        expect((await safeFetch(`${base}/missing`)).status).toBe(404);
    });
});

describe("test-mode escape hatch is closed outside the emulator", () => {
    it("refuses loopback when FUNCTIONS_EMULATOR is not set", async () => {
        const saved = process.env.FUNCTIONS_EMULATOR;
        delete process.env.FUNCTIONS_EMULATOR;
        try {
            await expect(safeFetch(`${base}/ok`)).rejects.toBeInstanceOf(FetchBlockedError);
        } finally {
            process.env.FUNCTIONS_EMULATOR = saved;
        }
    });
});
