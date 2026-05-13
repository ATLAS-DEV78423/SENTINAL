import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { ProjectConfig } from "./types.js";

export function defaultProjectConfig(): ProjectConfig {
  return {
    productDescription: "",
    stack: [],
    preferredLibraries: [],
    antiPatterns: [],
    designRules: [],
    requirements: [],
    carryOverRules: [],
    promptTemplate: "",
    defaultMode: "passive",
    allowGitBootstrap: true,
    allowFileWatcherFallback: true,
    healthScore: {
      contradictionWeight: 0.35,
      badPracticeWeight: 0.25,
      consistencyWeight: 0.2,
      decisionCoverageWeight: 0.1,
      sessionTrendWeight: 0.1
    }
  };
}

export function normalizeProjectConfig(input: Partial<ProjectConfig> | undefined): ProjectConfig {
  const base = defaultProjectConfig();
  const config: ProjectConfig = {
    ...base,
    ...input,
    stack: [...(input?.stack ?? base.stack)],
    preferredLibraries: [...(input?.preferredLibraries ?? base.preferredLibraries)],
    antiPatterns: [...(input?.antiPatterns ?? base.antiPatterns)],
    designRules: [...(input?.designRules ?? base.designRules)],
    requirements: [...(input?.requirements ?? base.requirements)],
    carryOverRules: [...(input?.carryOverRules ?? base.carryOverRules)],
    healthScore: {
      ...base.healthScore,
      ...(input?.healthScore ?? {})
    }
  };
  return config;
}

export function parseProjectConfig(text: string): ProjectConfig {
  const raw = yaml.load(text);
  const data = raw && typeof raw === "object" ? (raw as Partial<ProjectConfig>) : {};
  return normalizeProjectConfig(data);
}

export function stringifyProjectConfig(config: ProjectConfig): string {
  return yaml.dump(config, { noRefs: true, lineWidth: 100 });
}

export async function loadProjectConfig(configPath: string): Promise<ProjectConfig> {
  const text = await readFile(configPath, "utf8");
  return parseProjectConfig(text);
}

export async function saveProjectConfig(configPath: string, config: ProjectConfig): Promise<void> {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, stringifyProjectConfig(config), "utf8");
}
