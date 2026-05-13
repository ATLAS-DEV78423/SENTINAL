import os from "node:os";
import path from "node:path";
import {
  SENTINEL_BOOTSTRAP_FILE,
  SENTINEL_CONFIG_FILE,
  SENTINEL_DECISIONS_DIR,
  SENTINEL_DIR_NAME,
  SENTINEL_GLOBAL_DIR_NAME,
  SENTINEL_OVERRIDES_FILE,
  SENTINEL_PATTERNS_DIR,
  SENTINEL_REPORTS_DIR,
  SENTINEL_SESSIONS_DIR,
  SENTINEL_TEMPLATES_DIR,
  SENTINEL_VAULT_DIR
} from "./constants.js";

export function getSentinelRoot(projectRoot: string): string {
  return path.join(projectRoot, SENTINEL_DIR_NAME);
}

export function getProjectPath(projectRoot: string, ...parts: string[]): string {
  return path.join(getSentinelRoot(projectRoot), ...parts);
}

export function getGlobalVaultRoot(homeDir: string = os.homedir()): string {
  return path.join(homeDir, ".sentinel", SENTINEL_GLOBAL_DIR_NAME);
}

export function projectPaths(projectRoot: string) {
  const sentinelRoot = getSentinelRoot(projectRoot);
  return {
    sentinelRoot,
    configPath: path.join(sentinelRoot, SENTINEL_CONFIG_FILE),
    overridesPath: path.join(sentinelRoot, SENTINEL_OVERRIDES_FILE),
    bootstrapPath: path.join(sentinelRoot, SENTINEL_BOOTSTRAP_FILE),
    reportsDir: path.join(sentinelRoot, SENTINEL_REPORTS_DIR),
    vaultDir: path.join(sentinelRoot, SENTINEL_VAULT_DIR),
    decisionsDir: path.join(sentinelRoot, SENTINEL_VAULT_DIR, SENTINEL_DECISIONS_DIR),
    sessionsDir: path.join(sentinelRoot, SENTINEL_VAULT_DIR, SENTINEL_SESSIONS_DIR),
    contradictionsDir: path.join(sentinelRoot, SENTINEL_VAULT_DIR, "contradictions"),
    patternsDir: path.join(sentinelRoot, SENTINEL_VAULT_DIR, SENTINEL_PATTERNS_DIR),
    templatesDir: path.join(sentinelRoot, SENTINEL_VAULT_DIR, SENTINEL_TEMPLATES_DIR)
  };
}

export function globalPaths(homeDir: string = os.homedir()) {
  const globalRoot = getGlobalVaultRoot(homeDir);
  return {
    globalRoot,
    profilePath: path.join(globalRoot, "profile.md"),
    antiPatternsPath: path.join(globalRoot, "anti-patterns.md"),
    templatesDir: path.join(globalRoot, SENTINEL_TEMPLATES_DIR),
    patternsDir: path.join(globalRoot, SENTINEL_PATTERNS_DIR)
  };
}

