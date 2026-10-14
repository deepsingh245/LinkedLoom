// Client-side shapes for AI Autopilot (mirrors functions/src/autopilot/types.ts).

export type PersonaStatus = "active" | "paused" | "archived";
export type PersonaTone = "professional" | "casual" | "technical";
export type ModelProfile = "economy" | "balanced" | "quality";
export type AutopilotPlatform = "linkedin";

export interface PostingWindow {
  start: string; // HH:mm
  end: string;   // HH:mm
}

/** Editable persona configuration (what the form sends to the backend). */
export interface PersonaInput {
  name: string;
  description?: string;
  identity: {
    role: string;
    targetAudience: string;
    tone: PersonaTone;
    language: string;
    customInstructions?: string;
  };
  research: {
    topics: string[];
    keywords: string[];
    excludedTopics: string[];
    feedUrls: string[];
    freshnessHours: number;
    minSourceCount: number;
    webSearch?: boolean;
  };
  publishing: {
    accountIds: AutopilotPlatform[];
    postsPerDay: number;
    timezone: string;
    postingWindows: PostingWindow[];
    approvalMode: "manual";
    allowImages: boolean;
  };
  ai: {
    connectionId?: string;
    modelProfile: ModelProfile;
    monthlyCreditLimit: number;
  };
}

export interface Persona extends PersonaInput {
  id: string;
  workspaceId: string;
  research: PersonaInput["research"] & { sourceIds: string[] };
  status: PersonaStatus;
  version: number;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AutopilotSettings {
  autopilotEnabled: boolean;
  updatedAt?: Date;
}
