import * as dns from "dns";
import * as http from "http";
import * as https from "https";
import { isIP } from "net";

/**
 * SSRF-safe HTTP fetcher for user-influenced URLs (feeds, article pages, search-result links).
 *
 * - https only, port 443 only
 * - every connection is made to an IP address we validated ourselves (custom `lookup`), which
 *   also defeats DNS rebinding (the check and the connect use the same resolution)
 * - redirects are followed manually (max 3) and re-validated at each hop
 * - hard timeout, streaming size cap, content-type allowlist, no cookies / auth headers
 *
 * Test-only escape hatch: RESEARCH_ALLOW_LOCALHOST=true (honoured ONLY inside the Functions emulator)
 * allows http and loopback so e2e tests can use a local fixture server.
 */

export const USER_AGENT = "LinkedLoomResearch/1.0 (+https://linkedloom.app)";
const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export class FetchBlockedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FetchBlockedError";
    }
}

export const allowLocalhost = () => process.env.RESEARCH_ALLOW_LOCALHOST === "true" && process.env.FUNCTIONS_EMULATOR === "true";

function ipv4ToInt(ip: string): number {
    return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const V4_BLOCKS: Array<[string, number]> = [
    ["0.0.0.0", 8], // "this" network
    ["10.0.0.0", 8], // private
    ["100.64.0.0", 10], // carrier-grade NAT
    ["127.0.0.0", 8], // loopback
    ["169.254.0.0", 16], // link-local incl. cloud metadata 169.254.169.254
    ["172.16.0.0", 12], // private
    ["192.0.0.0", 24], // IETF protocol assignments
    ["192.0.2.0", 24], // documentation
    ["192.168.0.0", 16], // private
    ["198.18.0.0", 15], // benchmarking
    ["198.51.100.0", 24], // documentation
    ["203.0.113.0", 24], // documentation
    ["224.0.0.0", 4], // multicast
    ["240.0.0.0", 4], // reserved + broadcast
];

function isBlockedV4(ip: string): boolean {
    const value = ipv4ToInt(ip);
    return V4_BLOCKS.some(([base, bits]) => {
        const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
        return (value & mask) === (ipv4ToInt(base) & mask);
    });
}

/** Expand an IPv6 address to 8 hextets (handles `::` and a trailing dotted IPv4). */
function expandV6(ip: string): number[] | null {
    let address = ip.split("%")[0].toLowerCase();
    const dotted = address.match(/(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) {
        const v4 = ipv4ToInt(dotted[1]);
        address = address.replace(dotted[1], `${((v4 >>> 16) & 0xffff).toString(16)}:${(v4 & 0xffff).toString(16)}`);
    }
    const halves = address.split("::");
    if (halves.length > 2) return null;
    const head = halves[0] ? halves[0].split(":") : [];
    const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
    const missing = 8 - head.length - tail.length;
    if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
    const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
    if (groups.length !== 8) return null;
    const parsed = groups.map((g) => parseInt(g || "0", 16));
    return parsed.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff) ? null : parsed;
}

function isBlockedV6(ip: string): boolean {
    const g = expandV6(ip);
    if (!g) return true; // unparseable → refuse
    if (g.every((n) => n === 0)) return true; // ::
    if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return true; // ::1
    // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d): judge the embedded IPv4
    if (g.slice(0, 5).every((n) => n === 0) && (g[5] === 0xffff || g[5] === 0)) {
        return isBlockedV4(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
    }
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((g[0] & 0xff00) === 0xff00) return true; // multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
    if (g[0] === 0x0064 && g[1] === 0xff9b) return isBlockedV4(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`); // NAT64
    return false;
}

/** True when connecting to this IP must be refused (private, loopback, link-local, metadata, ...). */
export function isBlockedIp(ip: string): boolean {
    const version = isIP(ip);
    if (version === 4) return isBlockedV4(ip);
    if (version === 6) return isBlockedV6(ip);
    return true;
}

function isLoopback(ip: string): boolean {
    return ip === "::1" || ip.startsWith("127.");
}

/** URL.hostname keeps the brackets of IPv6 literals ("[::1]"); strip them before any IP check. */
const bareHost = (url: URL) => url.hostname.replace(/^\[|\]$/g, "");

/** True when the URL's host is an IP literal that we must not connect to. */
function isBlockedLiteral(url: URL): boolean {
    const host = bareHost(url);
    return isIP(host) !== 0 && isBlockedIp(host) && !(allowLocalhost() && isLoopback(host));
}

function validateUrl(raw: string): URL {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new FetchBlockedError("Invalid URL.");
    }
    if (url.username || url.password) throw new FetchBlockedError("URLs with credentials are not allowed.");
    const testMode = allowLocalhost();
    if (url.protocol !== "https:" && !(testMode && url.protocol === "http:")) throw new FetchBlockedError("Only https:// URLs are allowed.");
    if (!testMode && url.port && url.port !== "443") throw new FetchBlockedError("Only the default https port is allowed.");
    return url;
}

/** DNS lookup that refuses to hand back blocked addresses; the socket connects to exactly what we checked. */
function safeLookup(
    hostname: string,
    options: dns.LookupOptions,
    callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void
) {
    dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error, "", 0);
        const testMode = allowLocalhost();
        const allowed = (addresses as dns.LookupAddress[]).filter((a) => !isBlockedIp(a.address) || (testMode && isLoopback(a.address)));
        if (!allowed.length) {
            return callback(new FetchBlockedError(`Blocked address for ${hostname}.`), "", 0);
        }
        if (options.all) return callback(null, allowed);
        return callback(null, allowed[0].address, allowed[0].family);
    });
}

export interface SafeFetchOptions {
    timeoutMs?: number;
    maxBytes?: number;
    /** Allowed content-type prefixes/substrings (lowercase). */
    accept?: string[];
    /** Extra request headers (never cookies/authorization). */
    headers?: Record<string, string>;
}

export interface SafeFetchResult {
    url: string; // final URL after redirects
    status: number;
    contentType: string;
    body: string;
    redirects: number;
}

const DEFAULT_ACCEPT = ["text/html", "application/xhtml", "application/xml", "text/xml", "application/rss", "application/atom", "text/plain"];

function requestOnce(url: URL, options: Required<Pick<SafeFetchOptions, "timeoutMs" | "maxBytes" | "accept">> & { headers: Record<string, string> }) {
    return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
        const transport = url.protocol === "http:" ? http : https;
        const request = transport.request(
            url,
            {
                method: "GET",
                // IP-literal hosts skip DNS; safeFetch() validates those before calling us.
                lookup: isIP(bareHost(url)) ? undefined : (safeLookup as never),
                headers: {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.5",
                    "Accept-Encoding": "identity",
                    ...options.headers,
                },
            },
            (response) => {
                const status = response.statusCode ?? 0;
                if (status >= 300 && status < 400) {
                    response.resume();
                    return resolve({ status, headers: response.headers, body: "" });
                }
                const type = String(response.headers["content-type"] ?? "").toLowerCase();
                if (!options.accept.some((a) => type.includes(a))) {
                    response.resume();
                    return reject(new FetchBlockedError(`Unsupported content type: ${type || "unknown"}.`));
                }
                const declared = Number(response.headers["content-length"]);
                if (declared > options.maxBytes) {
                    response.resume();
                    return reject(new FetchBlockedError("Response is too large."));
                }
                const chunks: Buffer[] = [];
                let size = 0;
                response.on("data", (chunk: Buffer) => {
                    size += chunk.length;
                    if (size > options.maxBytes) {
                        response.destroy();
                        reject(new FetchBlockedError("Response is too large."));
                        return;
                    }
                    chunks.push(chunk);
                });
                response.on("end", () => resolve({ status, headers: response.headers, body: Buffer.concat(chunks).toString("utf8") }));
                response.on("error", reject);
            }
        );
        request.setTimeout(options.timeoutMs, () => request.destroy(new Error("Request timed out.")));
        request.on("error", reject);
        request.end();
    });
}

/** Fetch a URL with SSRF protection. Throws FetchBlockedError for policy violations, Error for network failures. */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
    const options = {
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBytes: opts.maxBytes ?? DEFAULT_MAX_BYTES,
        accept: opts.accept ?? DEFAULT_ACCEPT,
        headers: Object.fromEntries(Object.entries(opts.headers ?? {}).filter(([k]) => !/^(cookie|authorization|proxy-)/i.test(k))),
    };
    const deadline = Date.now() + options.timeoutMs;

    let current = validateUrl(rawUrl);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error("Request timed out.");
        if (isBlockedLiteral(current)) throw new FetchBlockedError("Blocked address.");
        const response = await requestOnce(current, { ...options, timeoutMs: remaining });
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.location;
            if (!location) throw new Error(`Redirect without a location (${response.status}).`);
            current = validateUrl(new URL(location, current).toString());
            continue;
        }
        return {
            url: current.toString(),
            status: response.status,
            contentType: String(response.headers["content-type"] ?? ""),
            body: response.body,
            redirects: hop,
        };
    }
    throw new FetchBlockedError("Too many redirects.");
}
