// Client-side shapes for AI connections, credits and usage (mirrors functions/src/ai-core + billing).

export type AIProviderId = "gemini" | "openai";
export type AIConnectionStatus = "active" | "invalid" | "revoked";

export interface AIConnection {
  id: string;
  provider: AIProviderId;
  label: string;
  keyHint: string;
  status: AIConnectionStatus;
  lastError?: string;
  lastValidatedAt?: Date;
  createdAt?: Date;
}

export interface CreditWallet {
  balance: number;
  reserved: number;
  available: number;
  updatedAt?: Date;
}

export type LedgerType = "grant" | "reservation" | "consumption" | "release" | "adjustment";

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  balanceAfter: number;
  reservationId?: string;
  meta?: Record<string, unknown>;
  createdAt?: Date;
}

export interface UsageRecord {
  id: string;
  feature: string;
  personaId?: string;
  provider: AIProviderId;
  model: string;
  billingMode: "managed" | "byok";
  usage: { inputTokens: number; outputTokens: number };
  credits: number;
  status: "ok" | "failed" | "ambiguous";
  error?: string;
  createdAt?: Date;
}

export interface TestGenerationResult {
  topic: string;
  post: string;
  hashtags: string[];
  provider: AIProviderId;
  model: string;
  billingMode: "managed" | "byok";
  credits: number;
  usage: { inputTokens: number; outputTokens: number };
}
