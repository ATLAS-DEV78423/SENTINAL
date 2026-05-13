import type { LlmProviderName } from "@sentinel/llm";

export type SentinelTaskType =
  | "contradictionDetection"
  | "badPracticeAnalysis"
  | "promptCompression"
  | "vaultSummarization";

export interface ProviderPreferences {
  defaultProvider: LlmProviderName;
  modelAssignments: Record<SentinelTaskType, string>;
  syncTarget: string;
}

export interface ProviderSecretStatus {
  configured: boolean;
  masked: string;
}

export const PROVIDERS: LlmProviderName[] = [
  "gemini",
  "grok",
  "openrouter",
  "nvidia-nim",
  "groq",
  "openai",
  "anthropic",
  "minimax",
  "cohere",
  "mistral",
  "together-ai",
  "perplexity",
  "deepseek",
  "azure-openai"
];

export const TASK_TYPES: SentinelTaskType[] = [
  "contradictionDetection",
  "badPracticeAnalysis",
  "promptCompression",
  "vaultSummarization"
];

export function defaultProviderPreferences(): ProviderPreferences {
  return {
    defaultProvider: "gemini",
    modelAssignments: {
      contradictionDetection: "",
      badPracticeAnalysis: "",
      promptCompression: "",
      vaultSummarization: ""
    },
    syncTarget: ""
  };
}

export function maskSecret(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return "Not set";
  }
  return `******** (${value.trim().length} chars)`;
}

export function createEmptySecretStatus(): Record<LlmProviderName, ProviderSecretStatus> {
  return {
    gemini: { configured: false, masked: "Not set" },
    grok: { configured: false, masked: "Not set" },
    openrouter: { configured: false, masked: "Not set" },
    "nvidia-nim": { configured: false, masked: "Not set" },
    groq: { configured: false, masked: "Not set" },
    openai: { configured: false, masked: "Not set" },
    anthropic: { configured: false, masked: "Not set" },
    minimax: { configured: false, masked: "Not set" },
    cohere: { configured: false, masked: "Not set" },
    mistral: { configured: false, masked: "Not set" },
    "together-ai": { configured: false, masked: "Not set" },
    perplexity: { configured: false, masked: "Not set" },
    deepseek: { configured: false, masked: "Not set" },
    "azure-openai": { configured: false, masked: "Not set" }
  };
}
