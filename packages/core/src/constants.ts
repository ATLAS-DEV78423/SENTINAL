export const SENTINEL_DIR_NAME = ".sentinel";
export const SENTINEL_CONFIG_FILE = "config.yml";
export const SENTINEL_OVERRIDES_FILE = "overrides.yml";
export const SENTINEL_BOOTSTRAP_FILE = "bootstrap.md";
export const SENTINEL_REPORTS_DIR = "reports";
export const SENTINEL_VAULT_DIR = "vault";
export const SENTINEL_DECISIONS_DIR = "decisions";
export const SENTINEL_SESSIONS_DIR = "sessions";
export const SENTINEL_CONTRADICTIONS_DIR = "contradictions";
export const SENTINEL_PATTERNS_DIR = "patterns";
export const SENTINEL_TEMPLATES_DIR = "templates";
export const SENTINEL_GLOBAL_DIR_NAME = "global";
export const DEFAULT_HEALTH_SCORE = 100;

export const DEFAULT_SCORE_WEIGHTS = {
  contradiction: 0.35,
  badPractice: 0.25,
  consistency: 0.2,
  decisionCoverage: 0.1,
  sessionTrend: 0.1
} as const;

