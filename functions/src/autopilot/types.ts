import type { Timestamp } from "firebase-admin/firestore";
import type { PersonaInput } from "./schema";
import type { PERSONA_STATUSES } from "./limits";

export type PersonaStatus = (typeof PERSONA_STATUSES)[number];

// Persona as stored at workspaces/{workspaceId}/personas/{personaId}.
// Follows docs/ai-autopilot/architecture.md §4.1, plus research.feedUrls (RSS for the MVP).
export type Persona = PersonaInput & {
    id: string;
    workspaceId: string;
    research: PersonaInput["research"] & { sourceIds: string[] };
    status: PersonaStatus;
    version: number;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

export type Workspace = {
    id: string;
    ownerId: string;
    type: "personal";
    createdAt: Timestamp;
};

export type WorkspaceMember = {
    uid: string;
    role: "owner";
    createdAt: Timestamp;
};

export type AutopilotSettings = {
    autopilotEnabled: boolean;
    updatedAt: Timestamp;
};

export type AuditAction =
    | "persona.create"
    | "persona.update"
    | "persona.status"
    | "persona.delete"
    | "autopilot.toggle"
    | "ai.connection.add"
    | "ai.connection.test"
    | "ai.connection.revoke"
    | "credits.grant"
    | "persona.testGenerate";

export type AuditLog = {
    action: AuditAction;
    actorId: string;
    targetId?: string;
    meta?: Record<string, unknown>;
    createdAt: Timestamp;
};
