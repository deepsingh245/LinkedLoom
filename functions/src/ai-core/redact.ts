// Remove anything that looks like a credential from text before it is logged or returned.
const REPLACEMENTS: Array<[RegExp, string]> = [
    [/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED]"], // OpenAI keys
    [/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED]"], // Google API keys
    [/(Bearer\s+)[A-Za-z0-9._-]{8,}/gi, "$1[REDACTED]"],
    [/([?&](?:key|api_key|apikey)=)[^&\s]+/gi, "$1[REDACTED]"],
];

export function redact(text: string, extraSecrets: string[] = []): string {
    let out = text;
    for (const secret of extraSecrets) {
        if (secret && secret.length >= 6) out = out.split(secret).join("[REDACTED]");
    }
    for (const [pattern, replacement] of REPLACEMENTS) {
        out = out.replace(pattern, replacement);
    }
    return out;
}

export function errorMessage(error: unknown, extraSecrets: string[] = []): string {
    const message = error instanceof Error ? error.message : String(error);
    return redact(message, extraSecrets).slice(0, 500);
}

/** "••••1234" style hint for an API key (never more than the last 4 chars). */
export function keyHint(apiKey: string): string {
    return `••••${apiKey.slice(-4)}`;
}
