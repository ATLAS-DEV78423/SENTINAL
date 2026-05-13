import assert from "node:assert/strict";
import test from "node:test";
import { buildBootstrapPrompt, loadProviderSecrets } from "../dist/router.js";

test("loads provider secrets from the expected environment variables", () => {
  const secrets = loadProviderSecrets({
    SENTINEL_GEMINI_API_KEY: "gemini-key",
    SENTINEL_GROK_API_KEY: "grok-key",
    SENTINEL_OPENROUTER_API_KEY: "openrouter-key",
    SENTINEL_NVIDIA_NIM_API_KEY: "nvidia-key",
    SENTINEL_GROQ_API_KEY: "groq-key",
    SENTINEL_OPENAI_API_KEY: "openai-key",
    SENTINEL_ANTHROPIC_API_KEY: "anthropic-key",
    SENTINEL_MINIMAX_API_KEY: "minimax-key",
    SENTINEL_COHERE_API_KEY: "cohere-key",
    SENTINEL_MISTRAL_API_KEY: "mistral-key",
    SENTINEL_TOGETHER_AI_API_KEY: "togetherai-key",
    SENTINEL_PERPLEXITY_API_KEY: "perplexity-key",
    SENTINEL_DEEPSEEK_API_KEY: "deepseek-key",
    SENTINEL_AZURE_OPENAI_API_KEY: "azure-openai-key"
  });

  assert.deepEqual(secrets, {
    gemini: "gemini-key",
    grok: "grok-key",
    openrouter: "openrouter-key",
    nvidiaNim: "nvidia-key",
    groq: "groq-key",
    openai: "openai-key",
    anthropic: "anthropic-key",
    minimax: "minimax-key",
    cohere: "cohere-key",
    mistral: "mistral-key",
    togetherAi: "togetherai-key",
    perplexity: "perplexity-key",
    deepseek: "deepseek-key",
    azureOpenai: "azure-openai-key"
  });
});

test("bootstrap prompts include the requested project context", () => {
  const prompt = buildBootstrapPrompt(
    {
      productDescription: "Sentinel",
      stack: ["TypeScript", "VS Code"],
      preferredLibraries: [],
      requirements: ["No telemetry"],
      antiPatterns: ["No secrets in logs"],
      designRules: [],
      carryOverRules: [],
      promptTemplate: "",
      defaultMode: "passive",
      allowGitBootstrap: true,
      allowFileWatcherFallback: true
    },
    "Recent summary"
  );

  assert.match(prompt, /Project: Sentinel/);
  assert.match(prompt, /Stack: TypeScript, VS Code/);
  assert.match(prompt, /Rules: No telemetry/);
  assert.match(prompt, /Anti-patterns: No secrets in logs/);
  assert.match(prompt, /Recent summary: Recent summary/);
});
