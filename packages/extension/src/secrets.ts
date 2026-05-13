import type { LlmProviderName, ProviderSecrets } from "@sentinel/llm";
import { PROVIDERS, createEmptySecretStatus, maskSecret, type ProviderSecretStatus } from "./provider-state.js";

export interface SecretStorageLike {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
}

const SECRET_PREFIX = "sentinel.provider-secret.";
const SECRET_PROPERTY_BY_PROVIDER: Record<LlmProviderName, keyof ProviderSecrets> = {
  gemini: "gemini",
  grok: "grok",
  openrouter: "openrouter",
  "nvidia-nim": "nvidiaNim",
  groq: "groq",
  openai: "openai",
  anthropic: "anthropic",
  minimax: "minimax",
  cohere: "cohere",
  mistral: "mistral",
  "together-ai": "togetherAi",
  perplexity: "perplexity",
  deepseek: "deepseek",
  "azure-openai": "azureOpenai"
};

function secretKey(provider: LlmProviderName): string {
  return `${SECRET_PREFIX}${provider}`;
}

export class SentinelSecretStore {
  constructor(private readonly storage: SecretStorageLike) {}

  async loadSecrets(): Promise<ProviderSecrets> {
    const entries = await Promise.all(PROVIDERS.map(async (provider) => [provider, await this.storage.get(secretKey(provider))] as const));
    const secrets: ProviderSecrets = {};
    for (const [provider, value] of entries) {
      if (value && value.trim().length > 0) {
        secrets[SECRET_PROPERTY_BY_PROVIDER[provider]] = value.trim();
      }
    }
    return secrets;
  }

  async loadSecretStatus(): Promise<Record<LlmProviderName, ProviderSecretStatus>> {
    const secrets = await this.loadSecrets();
    const status = createEmptySecretStatus();
    for (const provider of PROVIDERS) {
      const property = SECRET_PROPERTY_BY_PROVIDER[provider];
      const value = secrets[property];
      status[provider] = {
        configured: Boolean(value && value.trim().length > 0),
        masked: maskSecret(value)
      };
    }
    return status;
  }

  async save(provider: LlmProviderName, value: string): Promise<void> {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      await this.clear(provider);
      return;
    }
    await this.storage.store(secretKey(provider), trimmed);
  }

  async clear(provider: LlmProviderName): Promise<void> {
    await this.storage.delete(secretKey(provider));
  }
}
