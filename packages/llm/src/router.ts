import { ProjectConfig, SourceKind } from "@sentinel/core";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type LlmProviderName =
  | "gemini"
  | "grok"
  | "openrouter"
  | "nvidia-nim"
  | "groq"
  | "openai"
  | "anthropic"
  | "minimax"
  | "cohere"
  | "mistral"
  | "together-ai"
  | "perplexity"
  | "deepseek"
  | "azure-openai";

export interface LlmRequest {
  provider: LlmProviderName;
  model: string;
  prompt: string;
  temperature?: number;
}

export interface LlmResponse {
  provider: LlmProviderName;
  model: string;
  text: string;
  source: SourceKind;
}

export interface ProviderSecrets {
  gemini?: string;
  grok?: string;
  openrouter?: string;
  nvidiaNim?: string;
  groq?: string;
  openai?: string;
  anthropic?: string;
  minimax?: string;
  cohere?: string;
  mistral?: string;
  togetherAi?: string;
  perplexity?: string;
  deepseek?: string;
  azureOpenai?: string;
}

export const PROVIDER_SECRET_ENV_KEYS: Record<LlmProviderName, string> = {
  gemini: "SENTINEL_GEMINI_API_KEY",
  grok: "SENTINEL_GROK_API_KEY",
  openrouter: "SENTINEL_OPENROUTER_API_KEY",
  "nvidia-nim": "SENTINEL_NVIDIA_NIM_API_KEY",
  groq: "SENTINEL_GROQ_API_KEY",
  openai: "SENTINEL_OPENAI_API_KEY",
  anthropic: "SENTINEL_ANTHROPIC_API_KEY",
  minimax: "SENTINEL_MINIMAX_API_KEY",
  cohere: "SENTINEL_COHERE_API_KEY",
  mistral: "SENTINEL_MISTRAL_API_KEY",
  "together-ai": "SENTINEL_TOGETHER_AI_API_KEY",
  perplexity: "SENTINEL_PERPLEXITY_API_KEY",
  deepseek: "SENTINEL_DEEPSEEK_API_KEY",
  "azure-openai": "SENTINEL_AZURE_OPENAI_API_KEY"
};

export interface LlmRouterOptions {
  secrets: ProviderSecrets;
  fetchImpl?: typeof fetch;
}

export function loadProviderSecrets(env: NodeJS.ProcessEnv = process.env): ProviderSecrets {
  const secrets: ProviderSecrets = {};
  const gemini = env[PROVIDER_SECRET_ENV_KEYS.gemini];
  const grok = env[PROVIDER_SECRET_ENV_KEYS.grok];
  const openrouter = env[PROVIDER_SECRET_ENV_KEYS.openrouter];
  const nvidiaNim = env[PROVIDER_SECRET_ENV_KEYS["nvidia-nim"]];
  const groq = env[PROVIDER_SECRET_ENV_KEYS.groq];
  const openai = env[PROVIDER_SECRET_ENV_KEYS.openai];
  const anthropic = env[PROVIDER_SECRET_ENV_KEYS.anthropic];
  const minimax = env[PROVIDER_SECRET_ENV_KEYS.minimax];
  const cohere = env[PROVIDER_SECRET_ENV_KEYS.cohere];
  const mistral = env[PROVIDER_SECRET_ENV_KEYS.mistral];
  const togetherAi = env[PROVIDER_SECRET_ENV_KEYS["together-ai"]];
  const perplexity = env[PROVIDER_SECRET_ENV_KEYS.perplexity];
  const deepseek = env[PROVIDER_SECRET_ENV_KEYS.deepseek];
  const azureOpenai = env[PROVIDER_SECRET_ENV_KEYS["azure-openai"]];
  if (gemini) secrets.gemini = gemini;
  if (grok) secrets.grok = grok;
  if (openrouter) secrets.openrouter = openrouter;
  if (nvidiaNim) secrets.nvidiaNim = nvidiaNim;
  if (groq) secrets.groq = groq;
  if (openai) secrets.openai = openai;
  if (anthropic) secrets.anthropic = anthropic;
  if (minimax) secrets.minimax = minimax;
  if (cohere) secrets.cohere = cohere;
  if (mistral) secrets.mistral = mistral;
  if (togetherAi) secrets.togetherAi = togetherAi;
  if (perplexity) secrets.perplexity = perplexity;
  if (deepseek) secrets.deepseek = deepseek;
  if (azureOpenai) secrets.azureOpenai = azureOpenai;
  return secrets;
}

async function callFetchJson(fetchImpl: typeof fetch, url: string, init: RequestInit): Promise<any> {
  const response = await fetchImpl(url, init);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`LLM request failed: ${response.status} ${text}`);
  }
  return response.json();
}

export class LlmRouter {
  private readonly secrets: ProviderSecrets;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LlmRouterOptions) {
    this.secrets = options.secrets;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

async generate(request: LlmRequest): Promise<LlmResponse> {
     switch (request.provider) {
       case "gemini":
         return this.generateGemini(request);
       case "grok":
         return this.generateGrok(request);
       case "openrouter":
         return this.generateOpenRouter(request);
       case "nvidia-nim":
         return this.generateNvidiaNim(request);
       case "groq":
         return this.generateGroq(request);
       case "openai":
         return this.generateOpenAI(request);
       case "anthropic":
         return this.generateAnthropic(request);
       case "minimax":
         return this.generateMinimax(request);
       case "cohere":
         return this.generateCohere(request);
       case "mistral":
         return this.generateMistral(request);
       case "together-ai":
         return this.generateTogetherAi(request);
       case "perplexity":
         return this.generatePerplexity(request);
       case "deepseek":
         return this.generateDeepSeek(request);
       case "azure-openai":
         return this.generateAzureOpenAI(request);
       default: {
         const _exhaustive: never = request.provider;
         throw new Error(`Unsupported provider: ${_exhaustive}`);
       }
     }
   }

  private async generateGemini(request: LlmRequest): Promise<LlmResponse> {
    const key = this.secrets.gemini;
    if (!key) throw new Error("Missing Gemini API key.");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: request.model });
    const result = await model.generateContent(request.prompt);
    const text = result.response.text();
    return { provider: request.provider, model: request.model, text, source: "llm" };
  }

  private async generateGrok(request: LlmRequest): Promise<LlmResponse> {
    const key = this.secrets.grok;
    if (!key) throw new Error("Missing Grok (xAI) API key.");
    const data = await callFetchJson(this.fetchImpl, "https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: "user", content: request.prompt }],
        temperature: request.temperature ?? 0.2
      })
    });
    return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
  }

  private async generateOpenRouter(request: LlmRequest): Promise<LlmResponse> {
    const key = this.secrets.openrouter;
    if (!key) throw new Error("Missing OpenRouter API key.");
    const data = await callFetchJson(this.fetchImpl, "https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}`, "x-title": "Sentinel" },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: "user", content: request.prompt }],
        temperature: request.temperature ?? 0.2
      })
    });
    return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
  }

  private async generateNvidiaNim(request: LlmRequest): Promise<LlmResponse> {
    const key = this.secrets.nvidiaNim;
    if (!key) throw new Error("Missing NVIDIA NIM API key.");
    const data = await callFetchJson(this.fetchImpl, "https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: "user", content: request.prompt }],
        temperature: request.temperature ?? 0.2
      })
    });
    return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
  }

  /**
   * Groq — OpenAI-compatible API, ultra-fast inference.
   * Endpoint: https://api.groq.com/openai/v1/chat/completions
   * Recommended models: llama-3.3-70b-versatile, mixtral-8x7b-32768, gemma2-9b-it
   */
  private async generateGroq(request: LlmRequest): Promise<LlmResponse> {
    const key = this.secrets.groq;
    if (!key) throw new Error("Missing Groq API key.");
    const data = await callFetchJson(this.fetchImpl, "https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: "user", content: request.prompt }],
        temperature: request.temperature ?? 0.2
      })
    });
    return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
  }

  /**
   * OpenAI — ChatGPT and GPT-4o family.
   * Endpoint: https://api.openai.com/v1/chat/completions
   * Recommended models: gpt-4o, gpt-4o-mini, gpt-4-turbo
   */
  private async generateOpenAI(request: LlmRequest): Promise<LlmResponse> {
    const key = this.secrets.openai;
    if (!key) throw new Error("Missing OpenAI API key.");
    const data = await callFetchJson(this.fetchImpl, "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: "user", content: request.prompt }],
        temperature: request.temperature ?? 0.2
      })
    });
    return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
  }

/**
    * Anthropic — Claude family (claude-3-5-sonnet, claude-3-haiku, etc.).
    * Uses the native Messages API (not OpenAI-compatible).
    * Endpoint: https://api.anthropic.com/v1/messages
    */
   private async generateAnthropic(request: LlmRequest): Promise<LlmResponse> {
     const key = this.secrets.anthropic;
     if (!key) throw new Error("Missing Anthropic API key.");
     const data = await callFetchJson(this.fetchImpl, "https://api.anthropic.com/v1/messages", {
       method: "POST",
       headers: {
         "content-type": "application/json",
         "x-api-key": key,
         "anthropic-version": "2023-06-01"
       },
       body: JSON.stringify({
         model: request.model,
         max_tokens: 2048,
         messages: [{ role: "user", content: request.prompt }]
       })
     });
     const text = data?.content?.[0]?.text ?? "";
     return { provider: request.provider, model: request.model, text, source: "llm" };
   }

   /**
    * Minimax — Abab series models.
    * Uses OpenAI-compatible API format.
    * Endpoint: https://api.minimax.chat/v1/text/chatcompletion_v2
    */
   private async generateMinimax(request: LlmRequest): Promise<LlmResponse> {
     const key = this.secrets.minimax;
     if (!key) throw new Error("Missing Minimax API key.");
     const data = await callFetchJson(this.fetchImpl, "https://api.minimax.chat/v1/text/chatcompletion_v2", {
       method: "POST",
       headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
       body: JSON.stringify({
         model: request.model,
         messages: [{ role: "user", content: request.prompt }],
         temperature: request.temperature ?? 0.2,
         max_tokens: 2048
       })
     });
     return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
   }

   /**
    * Cohere — Command series models.
    * Uses Cohere's native API format.
    * Endpoint: https://api.cohere.ai/v1/chat
    */
   private async generateCohere(request: LlmRequest): Promise<LlmResponse> {
     const key = this.secrets.cohere;
     if (!key) throw new Error("Missing Cohere API key.");
     const data = await callFetchJson(this.fetchImpl, "https://api.cohere.ai/v1/chat", {
       method: "POST",
       headers: { 
         "content-type": "application/json",
         authorization: `Bearer ${key}` 
       },
       body: JSON.stringify({
         model: request.model,
         message: request.prompt,
         temperature: request.temperature ?? 0.2,
         max_tokens: 2048
       })
     });
     return { provider: request.provider, model: request.model, text: data?.text ?? "", source: "llm" };
   }

   /**
    * Mistral — Mistral series models (mistral-large, mistral-medium, etc.).
    * Uses OpenAI-compatible API format.
    * Endpoint: https://api.mistral.ai/v1/chat/completions
    */
   private async generateMistral(request: LlmRequest): Promise<LlmResponse> {
     const key = this.secrets.mistral;
     if (!key) throw new Error("Missing Mistral API key.");
     const data = await callFetchJson(this.fetchImpl, "https://api.mistral.ai/v1/chat/completions", {
       method: "POST",
       headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
       body: JSON.stringify({
         model: request.model,
         messages: [{ role: "user", content: request.prompt }],
         temperature: request.temperature ?? 0.2
       })
     });
     return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
   }

   /**
    * Together AI — Open-source model hosting.
    * Uses OpenAI-compatible API format.
    * Endpoint: https://api.together.xyz/v1/chat/completions
    */
   private async generateTogetherAi(request: LlmRequest): Promise<LlmResponse> {
     const key = this.secrets.togetherAi;
     if (!key) throw new Error("Missing Together AI API key.");
     const data = await callFetchJson(this.fetchImpl, "https://api.together.xyz/v1/chat/completions", {
       method: "POST",
       headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
       body: JSON.stringify({
         model: request.model,
         messages: [{ role: "user", content: request.prompt }],
         temperature: request.temperature ?? 0.2
       })
     });
     return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
   }

   /**
    * Perplexity — Search-augmented LLMs (Sonar series).
    * Uses OpenAI-compatible API format with web search grounding.
    * Endpoint: https://api.perplexity.ai/chat/completions
    * Recommended models: sonar, sonar-pro
    */
   private async generatePerplexity(request: LlmRequest): Promise<LlmResponse> {
     const key = this.secrets.perplexity;
     if (!key) throw new Error("Missing Perplexity API key.");
     const data = await callFetchJson(this.fetchImpl, "https://api.perplexity.ai/chat/completions", {
       method: "POST",
       headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
       body: JSON.stringify({
         model: request.model,
         messages: [{ role: "user", content: request.prompt }],
         temperature: request.temperature ?? 0.2
       })
     });
     return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
   }

   /**
    * DeepSeek — High-performance, cost-effective models from China.
    * Uses OpenAI-compatible API format.
    * Endpoint: https://api.deepseek.com/v1/chat/completions
    * Recommended models: deepseek-chat, deepseek-coder
    */
   private async generateDeepSeek(request: LlmRequest): Promise<LlmResponse> {
     const key = this.secrets.deepseek;
     if (!key) throw new Error("Missing DeepSeek API key.");
     const data = await callFetchJson(this.fetchImpl, "https://api.deepseek.com/v1/chat/completions", {
       method: "POST",
       headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
       body: JSON.stringify({
         model: request.model,
         messages: [{ role: "user", content: request.prompt }],
         temperature: request.temperature ?? 0.2
       })
     });
     return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
   }

   /**
    * Azure OpenAI Service — Microsoft-hosted OpenAI models.
    * Uses OpenAI API format with Azure-specific endpoint and authentication.
    * Endpoint: https://{resource}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions
    * Note: Requires resource name and deployment ID in model format: "deployments/{deployment-id}"
    * Or full endpoint can be provided in model field.
    */
   private async generateAzureOpenAI(request: LlmRequest): Promise<LlmResponse> {
     const key = this.secrets.azureOpenai;
     if (!key) throw new Error("Missing Azure OpenAI API key.");
     
     // Determine endpoint - if model contains full URL, use it; otherwise construct from resource/deployment
     let endpoint = request.model;
     if (!endpoint.startsWith('http')) {
       // Assume model format is either "deployment-id" or we need to use env vars for resource
       // For simplicity, we'll expect users to provide full endpoint in model field
       // In a production implementation, we might have separate config for resource name
       throw new Error("Azure OpenAI model must be a full endpoint URL (e.g., https://resource.openai.azure.com/openai/deployments/deployment-id/chat/completions)");
     }
     
     const data = await callFetchJson(this.fetchImpl, endpoint, {
       method: "POST",
       headers: { 
         "content-type": "application/json", 
         "api-key": key  // Azure OpenAI uses api-key header instead of Authorization Bearer
       },
       body: JSON.stringify({
         messages: [{ role: "user", content: request.prompt }],
         temperature: request.temperature ?? 0.2
       })
     });
     return { provider: request.provider, model: request.model, text: data?.choices?.[0]?.message?.content ?? "", source: "llm" };
   }
}

export function buildBootstrapPrompt(config: ProjectConfig, recentSummary: string): string {
  return [
    `You are Sentinel, a read-only local-first coding companion.`,
    `Project: ${config.productDescription}`,
    `Stack: ${config.stack.join(", ")}`,
    `Rules: ${config.requirements.join(" | ")}`,
    `Anti-patterns: ${config.antiPatterns.join(" | ")}`,
    `Recent summary: ${recentSummary}`
  ].join("\n");
}
