import { z } from "zod";
import { ProviderError, StructuredSpec } from "../types";

/** JSON Schema for a zod schema, without the $schema header some providers reject. */
export function toProviderJsonSchema<T>(spec: StructuredSpec<T>): Record<string, unknown> {
    const schema = z.toJSONSchema(spec.schema) as Record<string, unknown>;
    delete schema.$schema;
    return schema;
}

/** Parse + validate model JSON output. Never trust the model to follow the schema. */
export function parseStructured<T>(text: string, spec: StructuredSpec<T>): T {
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        throw new ProviderError("bad_output", "The AI returned output that isn't valid JSON.");
    }
    const result = spec.schema.safeParse(json);
    if (!result.success) {
        throw new ProviderError("bad_output", "The AI output didn't match the expected format.");
    }
    return result.data;
}
