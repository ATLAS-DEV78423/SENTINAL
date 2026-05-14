import { mkdir, readFile, readdir, writeFile, copyFile, stat, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import yaml from "js-yaml";
import {
  DecisionRecord,
  ContradictionRecord,
  PatternRecord,
  ProjectConfig,
  SessionRecord,
  SessionReport,
  SessionFileChange,
  OverrideRule,
  ToolEventRecord
} from "@sentinel/core";
import { globalPaths, projectPaths, saveProjectConfig as saveYamlProjectConfig, loadProjectConfig as loadYamlProjectConfig } from "@sentinel/core";
import { parseMarkdownEntry, stringifyMarkdownEntry, buildSessionReportMarkdown } from "@sentinel/core";

export interface VaultPaths {
  root: string;
  configPath: string;
  overridesPath: string;
  bootstrapPath: string;
  reportsDir: string;
  vaultDir: string;
  decisionsDir: string;
  sessionsDir: string;
  contradictionsDir: string;
  patternsDir: string;
  templatesDir: string;
}

export interface GlobalVaultPaths {
  root: string;
  profilePath: string;
  antiPatternsPath: string;
  templatesDir: string;
  patternsDir: string;
}

function ensureIndexSuffix(value: number): string {
  return String(value).padStart(3, "0");
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureMarkdownPath(baseName: string, stamp: string, index: number): string {
  return `${baseName}-${stamp}-${ensureIndexSuffix(index)}.md`;
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

async function exists(pathName: string): Promise<boolean> {
  try {
    await stat(pathName);
    return true;
  } catch {
    return false;
  }
}

async function nextSequence(dirPath: string, prefix: string): Promise<number> {
  await ensureDir(dirPath);
  const files = await readdir(dirPath);
  let max = 0;
  for (const file of files) {
    if (!file.startsWith(prefix)) {
      continue;
    }
    const match = file.match(/-(\d{3})\.md$/);
    if (!match) {
      continue;
    }
    max = Math.max(max, Number(match[1] ?? 0));
  }
  return max + 1;
}

function digest(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

export function resolveProjectVault(projectRoot: string): VaultPaths {
  const paths = projectPaths(projectRoot);
  return {
    root: paths.sentinelRoot,
    configPath: paths.configPath,
    overridesPath: paths.overridesPath,
    bootstrapPath: paths.bootstrapPath,
    reportsDir: paths.reportsDir,
    vaultDir: paths.vaultDir,
    decisionsDir: paths.decisionsDir,
    sessionsDir: paths.sessionsDir,
    contradictionsDir: paths.contradictionsDir,
    patternsDir: paths.patternsDir,
    templatesDir: paths.templatesDir
  };
}

export function resolveGlobalVault(homeDir?: string): GlobalVaultPaths {
  const paths = globalPaths(homeDir);
  return {
    root: paths.globalRoot,
    profilePath: paths.profilePath,
    antiPatternsPath: paths.antiPatternsPath,
    templatesDir: paths.templatesDir,
    patternsDir: paths.patternsDir
  };
}

export class SentinelVault {
  readonly projectRoot: string;
  readonly paths: VaultPaths;
  readonly globalPaths: GlobalVaultPaths;

  constructor(projectRoot: string, homeDir?: string) {
    this.projectRoot = projectRoot;
    this.paths = resolveProjectVault(projectRoot);
    this.globalPaths = resolveGlobalVault(homeDir);
  }

  async ensureProjectStructure(): Promise<void> {
    await Promise.all([
      ensureDir(this.paths.root),
      ensureDir(this.paths.reportsDir),
      ensureDir(this.paths.vaultDir),
      ensureDir(this.paths.decisionsDir),
      ensureDir(this.paths.sessionsDir),
      ensureDir(this.paths.contradictionsDir),
      ensureDir(this.paths.patternsDir),
      ensureDir(this.paths.templatesDir)
    ]);
  }

  async ensureGlobalStructure(): Promise<void> {
    await Promise.all([
      ensureDir(this.globalPaths.root),
      ensureDir(this.globalPaths.templatesDir),
      ensureDir(this.globalPaths.patternsDir)
    ]);
    if (!(await exists(this.globalPaths.profilePath))) {
      await writeFile(this.globalPaths.profilePath, stringifyMarkdownEntry({ createdAt: new Date().toISOString() }, "# Personal Profile\n"), "utf8");
    }
    if (!(await exists(this.globalPaths.antiPatternsPath))) {
      await writeFile(this.globalPaths.antiPatternsPath, stringifyMarkdownEntry({ createdAt: new Date().toISOString() }, "# Personal Anti-Patterns\n"), "utf8");
    }
  }

  async initializeProjectFiles(config: ProjectConfig, overrides: OverrideRule[] = []): Promise<void> {
    await this.ensureProjectStructure();
    if (!(await exists(this.paths.configPath))) {
      await saveYamlProjectConfig(this.paths.configPath, config);
    }
    if (!(await exists(this.paths.overridesPath))) {
      await writeFile(this.paths.overridesPath, yaml.dump({ overrides }, { noRefs: true, lineWidth: 100 }), "utf8");
    }
  }

  async loadProjectConfig(): Promise<ProjectConfig | null> {
    if (!(await exists(this.paths.configPath))) {
      return null;
    }
    try {
      return await loadYamlProjectConfig(this.paths.configPath);
    } catch {
      return null;
    }
  }

  async loadOverrides(): Promise<OverrideRule[]> {
    if (!(await exists(this.paths.overridesPath))) {
      return [];
    }
    const text = await readFile(this.paths.overridesPath, "utf8");
    try {
      const parsed = yaml.load(text) as { overrides?: OverrideRule[] } | undefined;
      return parsed?.overrides ?? [];
    } catch {
      return [];
    }
  }

  async saveOverrides(overrides: OverrideRule[]): Promise<void> {
    await ensureDir(path.dirname(this.paths.overridesPath));
    await writeFile(this.paths.overridesPath, yaml.dump({ overrides }, { noRefs: true, lineWidth: 100 }), "utf8");
  }

  async saveBootstrapPrompt(content: string, metadata: Record<string, unknown> = {}): Promise<string> {
    await this.ensureProjectStructure();
    await writeFile(this.paths.bootstrapPath, content, "utf8");
    return this.paths.bootstrapPath;
  }

  async saveSessionRecord(session: SessionRecord): Promise<string> {
    await this.ensureProjectStructure();
    const fileName = `session-${session.startedAt.slice(0, 10)}-${session.id.slice(-3)}.md`;
    const filePath = path.join(this.paths.sessionsDir, fileName);
    const text = stringifyMarkdownEntry(
      {
        id: session.id,
        projectPath: session.projectPath,
        startedAt: session.startedAt,
        endedAt: session.endedAt ?? "",
        trigger: session.trigger,
        status: session.status,
        mode: session.mode,
        gitEnabled: session.gitEnabled,
        gitBootstrapRange: session.gitBootstrapRange ?? "",
        filesObserved: session.filesObserved,
        filesChanged: session.filesChanged,
        decisionsLogged: session.decisionsLogged,
        contradictionsOpen: session.contradictionsOpen,
        findingsOpen: session.findingsOpen,
        healthScoreStart: session.healthScoreStart,
        healthScoreEnd: session.healthScoreEnd,
        summary: session.summary ?? "",
        bootstrapPath: session.bootstrapPath ?? ""
      },
      [
        `# Session ${session.id}`,
        ``,
        `- Project: ${session.projectPath}`,
        `- Status: ${session.status}`,
        `- Mode: ${session.mode}`,
        `- Started: ${session.startedAt}`,
        session.endedAt ? `- Ended: ${session.endedAt}` : "",
        `- Health score start: ${session.healthScoreStart}`,
        `- Health score end: ${session.healthScoreEnd}`
      ].filter(Boolean).join("\n")
    );
    await writeFile(filePath, text, "utf8");
    return filePath;
  }

  async saveDecision(record: DecisionRecord): Promise<string> {
    await this.ensureProjectStructure();
    const date = record.createdAt.slice(0, 10);
    const seq = await nextSequence(this.paths.decisionsDir, `decision-${date}-`);
    const fileName = ensureMarkdownPath("decision", date, seq);
    const filePath = path.join(this.paths.decisionsDir, fileName);
    await writeFile(
      filePath,
      stringifyMarkdownEntry(record, `# ${record.title}\n\n${record.summary}\n`),
      "utf8"
    );
    return filePath;
  }

  async saveContradiction(record: ContradictionRecord): Promise<string> {
    await this.ensureProjectStructure();
    const date = record.detectedAt.slice(0, 10);
    const seq = await nextSequence(this.paths.contradictionsDir, `contradiction-${date}-`);
    const fileName = ensureMarkdownPath("contradiction", date, seq);
    const filePath = path.join(this.paths.contradictionsDir, fileName);
    await writeFile(
      filePath,
      stringifyMarkdownEntry(record, `# ${record.title}\n\n${record.description}\n`),
      "utf8"
    );
    return filePath;
  }

  async savePattern(record: PatternRecord): Promise<string> {
    await this.ensureGlobalStructure();
    const fileName = `${record.id}.md`;
    const filePath = path.join(this.globalPaths.patternsDir, fileName);
    await writeFile(
      filePath,
      stringifyMarkdownEntry(record, `# ${record.title}\n\n${record.summary}\n`),
      "utf8"
    );
    return filePath;
  }

  async saveReport(report: SessionReport): Promise<string> {
    await this.ensureProjectStructure();
    const fileName = `report-${report.session.startedAt.slice(0, 10)}-${report.session.id.slice(-3)}.md`;
    const filePath = path.join(this.paths.reportsDir, fileName);
    await writeFile(filePath, buildSessionReportMarkdown(report), "utf8");
    return filePath;
  }

  async saveToolEvent(record: ToolEventRecord): Promise<string> {
    await this.ensureProjectStructure();
    const filePath = path.join(this.paths.vaultDir, "tool-events.md");
    let text: string;
    try {
      text = await readFile(filePath, "utf8");
    } catch {
      text = stringifyMarkdownEntry({ events: [] }, "# Tool Events\n");
    }
    const next = `${text}\n- ${record.createdAt} ${record.tool}: ${record.requestSummary} -> ${record.responseSummary}`;
    await writeFile(filePath, next.trimEnd() + "\n", "utf8");
    return filePath;
  }

  async writeMarkdownEntry(filePath: string, data: Record<string, unknown>, content: string): Promise<void> {
    await ensureDir(path.dirname(filePath));
    await writeFile(filePath, stringifyMarkdownEntry(data, content), "utf8");
  }

  async readMarkdownEntry<T extends Record<string, unknown>>(filePath: string): Promise<{ data: T; content: string } | null> {
    if (!(await exists(filePath))) {
      return null;
    }
    const text = await readFile(filePath, "utf8");
    return parseMarkdownEntry<T>(text);
  }

  async loadLatestReport(): Promise<string | null> {
    if (!(await exists(this.paths.reportsDir))) {
      return null;
    }
    const files = await readdir(this.paths.reportsDir);
    const mdFiles = files.filter((file) => file.endsWith(".md")).sort();
    const latest = mdFiles.at(-1);
    return latest ? path.join(this.paths.reportsDir, latest) : null;
  }

  async loadLatestSessionRecord(): Promise<SessionRecord | null> {
    if (!(await exists(this.paths.sessionsDir))) {
      return null;
    }
    const files = await readdir(this.paths.sessionsDir);
    const sessionFiles = files.filter((file) => file.startsWith("session-") && file.endsWith(".md")).sort();
    const latest = sessionFiles.at(-1);
    if (!latest) {
      return null;
    }
    try {
      const entry = await this.readMarkdownEntry<Partial<SessionRecord>>(path.join(this.paths.sessionsDir, latest));
      if (!entry) {
        return null;
      }
      const data = entry.data;
      if (!data.id || !data.projectPath || !data.startedAt || !data.status) {
        return null;
      }
      const session: SessionRecord = {
        id: data.id,
        projectPath: data.projectPath,
        startedAt: data.startedAt,
        trigger: typeof data.trigger === "string" ? (data.trigger as SessionRecord["trigger"]) : "manual",
        mode: typeof data.mode === "string" ? (data.mode as SessionRecord["mode"]) : "passive",
        status: data.status,
        gitEnabled: Boolean(data.gitEnabled),
        filesObserved: Number(data.filesObserved ?? 0),
        filesChanged: Number(data.filesChanged ?? 0),
        decisionsLogged: Number(data.decisionsLogged ?? 0),
        contradictionsOpen: Number(data.contradictionsOpen ?? 0),
        findingsOpen: Number(data.findingsOpen ?? 0),
        healthScoreStart: Number(data.healthScoreStart ?? 0),
        healthScoreEnd: Number(data.healthScoreEnd ?? 0),
      };
      if (typeof data.endedAt === "string" && data.endedAt.length > 0) {
        session.endedAt = data.endedAt;
      }
      if (typeof data.gitBootstrapRange === "string" && data.gitBootstrapRange.length > 0) {
        session.gitBootstrapRange = data.gitBootstrapRange;
      }
      if (typeof data.summary === "string" && data.summary.length > 0) {
        session.summary = data.summary;
      }
      if (typeof data.bootstrapPath === "string" && data.bootstrapPath.length > 0) {
        session.bootstrapPath = data.bootstrapPath;
      }
      return session;
    } catch {
      return null;
    }
  }

  async copyProjectTemplate(sourceDir: string, targetDir: string): Promise<void> {
    await ensureDir(targetDir);
    const entries = await readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      const from = path.join(sourceDir, entry.name);
      const to = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        await this.copyProjectTemplate(from, to);
      } else {
        await copyFile(from, to);
      }
    }
  }

  async removeProjectArtifact(relativePath: string): Promise<void> {
    const target = path.join(this.paths.root, relativePath);
    await rm(target, { recursive: true, force: true });
  }

  async appendSessionNote(sessionId: string, note: string): Promise<string> {
    const sessionNotes = path.join(this.paths.sessionsDir, `${sessionId}-notes.md`);
    const existing = (await exists(sessionNotes)) ? await readFile(sessionNotes, "utf8") : "# Session Notes\n";
    await writeFile(sessionNotes, `${existing.trimEnd()}\n- ${note}\n`, "utf8");
    return sessionNotes;
  }

  async saveProjectSnapshot(sessionId: string, files: SessionFileChange[]): Promise<string> {
    const snapshotPath = path.join(this.paths.sessionsDir, `${sessionId}-files.md`);
    const body = [
      "# File Snapshot",
      "",
      ...files.map((file) => `- ${file.status}: ${file.path} :: ${file.summary}`)
    ].join("\n");
    await writeFile(snapshotPath, stringifyMarkdownEntry({ sessionId, files: files.length }, body), "utf8");
    return snapshotPath;
  }
}
