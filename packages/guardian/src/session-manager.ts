import { EventEmitter } from "node:events";
import { mkdir, readFile, readdir, stat, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { simpleGit, type SimpleGit } from "simple-git";
import {
  DecisionRecord,
  FindingRecord,
  HealthScoreSnapshot,
  OverrideRule,
  ProjectConfig,
  SessionMode,
  SessionRecord,
  SessionReport,
  SessionTrigger,
  SessionFileChange,
  SourceKind,
  ContradictionRecord,
  WorkspaceState
} from "@sentinel/core";
import { defaultProjectConfig, loadProjectConfig, saveProjectConfig, STACK_TEMPLATES, SENTINEL_EVENTS } from "@sentinel/core";
import { analyzeWorkspace, WorkspaceAnalysis } from "@sentinel/analyzer";
import { SentinelVault } from "@sentinel/vault";
import { McpHub } from "./mcp-hub.js";
import { parseMarkdownEntry } from "@sentinel/core";

export interface SessionManagerOptions {
  projectRoot: string;
  homeDir?: string;
  mode?: SessionMode;
  allowGitBootstrap?: boolean;
  allowFileWatcherFallback?: boolean;
  now?: () => Date;
}

export interface StartSessionOptions {
  trigger?: SessionTrigger;
  mode?: SessionMode;
}

interface WorkspaceFile {
  path: string;
  content: string;
}

function isoNow(now: () => Date): string {
  return now().toISOString();
}

function sessionIdFromDate(date: Date, sequence = 1): string {
  return `session-${date.toISOString().slice(0, 10)}-${String(sequence).padStart(3, "0")}`;
}

function parseSequence(name: string): number | null {
  const match = name.match(/-(\d{3})\.md$/);
  return match ? Number(match[1]) : null;
}

function relativePath(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function isPathWithinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative.length === 0 || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isIgnoredSegment(segment: string): boolean {
  return [
    "node_modules",
    ".git",
    ".sentinel",
    "dist",
    "out",
    "coverage",
    "render_out",
    "tmp"
  ].includes(segment);
}

function shouldInspectFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".yml", ".yaml", ".txt"].includes(ext);
}

async function walkFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (isIgnoredSegment(entry.name)) {
        continue;
      }
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(next);
      } else if (shouldInspectFile(next)) {
        results.push(next);
      }
    }
  }
  return results;
}

async function readWorkspaceFiles(root: string): Promise<WorkspaceFile[]> {
  const files = await walkFiles(root);
  const snapshots: WorkspaceFile[] = [];
  for (const filePath of files) {
    try {
      const text = await readFile(filePath, "utf8");
      snapshots.push({ path: relativePath(root, filePath), content: text });
    } catch {
      continue;
    }
  }
  return snapshots;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildFileTree(files: WorkspaceFile[], maxItems = 20): string {
  const topLevel = files
    .map((file) => file.path.split("/")[0] ?? file.path)
    .filter(Boolean);
  const unique = [...new Set(topLevel)].slice(0, maxItems);
  return unique.length > 0 ? unique.map((item) => `- ${item}`).join("\n") : "- No files found";
}

export class SessionManager extends EventEmitter {
  readonly projectRoot: string;
  readonly homeDir: string;
  readonly now: () => Date;
  readonly vault: SentinelVault;
  readonly mcpHub: McpHub;
  readonly configPath: string;
  readonly sessionMode: SessionMode;
  private git: SimpleGit | null = null;
  private config: ProjectConfig = defaultProjectConfig();
  private session: SessionRecord | null = null;
  private latestAnalysis: WorkspaceAnalysis | null = null;
  private trackedFiles: WorkspaceFile[] = [];
  private previousReports: SessionReport[] = [];
  private fileHistory: SessionFileChange[] = [];
  private previousScore = 0;
  private activeContradictions: ContradictionRecord[] = [];
  private overrides: OverrideRule[] = [];
  private gitAvailable = false;
  private decisions: DecisionRecord[] = [];
  private decisionCoverageFiles = new Set<string>();
  private currentBootstrapPrompt = "";

  constructor(options: SessionManagerOptions) {
    super();
    this.projectRoot = options.projectRoot;
    this.homeDir = options.homeDir ?? process.env.SENTINEL_HOME ?? os.homedir();
    this.now = options.now ?? (() => new Date());
    this.sessionMode = options.mode ?? "passive";
    this.vault = new SentinelVault(this.projectRoot, this.homeDir);
    this.mcpHub = new McpHub();
    this.configPath = path.join(this.projectRoot, ".sentinel", "config.yml");
  }

  static async open(options: SessionManagerOptions): Promise<SessionManager> {
    const manager = new SessionManager(options);
    await manager.initialize();
    return manager;
  }

  async initialize(): Promise<void> {
    await this.vault.ensureProjectStructure();
    await this.vault.ensureGlobalStructure();
    if (await fileExists(this.configPath)) {
      this.config = await loadProjectConfig(this.configPath);
    } else {
      this.config = defaultProjectConfig();
      await saveProjectConfig(this.configPath, this.config);
    }
    this.overrides = await this.vault.loadOverrides();
    this.git = simpleGit({ baseDir: this.projectRoot, binary: "git" });
    try {
      if (this.git) {
        const inside = await this.git.revparse(["--is-inside-work-tree"]);
        this.gitAvailable = inside.trim() === "true";
      }
    } catch {
      this.gitAvailable = false;
    }
    this.previousReports = await this.loadReports();
    this.previousScore = this.previousReports.at(-1)?.healthScore.total ?? 0;
    this.activeContradictions = this.previousReports.flatMap((report) => report.contradictions).filter((item) => item.status !== "resolved");
    this.decisionCoverageFiles = await this.loadDecisionCoverageFiles();
    const activeSession = await this.vault.loadLatestSessionRecord();
    if (activeSession && activeSession.status === "active") {
      this.session = activeSession;
      this.trackedFiles = await readWorkspaceFiles(this.projectRoot);
      this.latestAnalysis = this.analyzeCurrentWorkspace();
      this.applyAnalysisToSession(this.latestAnalysis);
      this.currentBootstrapPrompt = await this.generateBootstrapPrompt(this.latestAnalysis);
      await this.vault.saveBootstrapPrompt(this.currentBootstrapPrompt);
    }
  }

  private async loadReports(): Promise<SessionReport[]> {
    const reportsDir = this.vault.paths.reportsDir;
    if (!(await fileExists(reportsDir))) {
      return [];
    }
    const files = await readdir(reportsDir);
    const reports: SessionReport[] = [];
    for (const file of files.filter((entry) => entry.endsWith(".md")).sort()) {
      const fullPath = path.join(reportsDir, file);
      const text = await readFile(fullPath, "utf8");
      const parsed = parseMarkdownEntry<Record<string, unknown>>(text);
      const startedAt = String(parsed.data.startedAt ?? new Date().toISOString());
      const contradictions = text
        .split(/\r?\n/)
        .filter((line) => /^\-\s\[(info|warning|critical)\]\s/.test(line))
        .map((line) => {
          const match = line.match(/^\-\s\[(info|warning|critical)\]\s(.+?)\s\((open|partially-addressed|resolved)\)$/i);
          const severity = (match?.[1] ?? "info").toLowerCase() as "info" | "warning" | "critical";
          const title = match?.[2] ?? line.replace(/^\-\s\[[^\]]+\]\s/, "").replace(/\s\(.+\)$/, "");
          const status = (match?.[3] ?? "open") as "open" | "partially-addressed" | "resolved";
          return {
            id: `${file}-${title}`,
            sessionId: String(parsed.data.id ?? file),
            projectPath: this.projectRoot,
            title,
            description: title,
            severity,
            status,
            evidence: [],
            relatedFiles: [],
            detectedAt: startedAt,
            source: "file" as const
          };
        });
      reports.push({
        session: {
          id: String(parsed.data.id ?? file.replace(/^report-/, "").replace(/\.md$/, "")),
          projectPath: String(parsed.data.projectPath ?? this.projectRoot),
          startedAt,
          endedAt: String(parsed.data.endedAt ?? startedAt),
          trigger: "manual",
          mode: this.sessionMode,
          status: "ended",
          gitEnabled: Boolean(this.git),
          filesObserved: 0,
          filesChanged: 0,
          decisionsLogged: 0,
          contradictionsOpen: contradictions.filter((item) => item.status !== "resolved").length,
          findingsOpen: 0,
          healthScoreStart: 0,
          healthScoreEnd: Number(parsed.data.healthScore ?? 0),
          summary: text.split(/\r?\n/).slice(0, 1).join("")
        },
        filesChanged: [],
        decisions: [],
        contradictions,
        findings: [],
        healthScore: {
          total: Number(parsed.data.healthScore ?? 0),
          previous: 0,
          delta: 0,
          components: {
            contradiction: 0,
            badPractice: 0,
            consistency: 0,
            decisionCoverage: 0,
            sessionTrend: 0
          },
          componentDetails: {
            contradiction: [],
            badPractice: [],
            consistency: [],
            decisionCoverage: [],
            sessionTrend: []
          },
          trend: []
        },
        nextStep: "",
        bootstrapPrompt: "",
        generatedAt: startedAt
      });
    }
    return reports;
  }

  private async loadDecisionCoverageFiles(): Promise<Set<string>> {
    const coverage = new Set<string>();
    const decisionsDir = this.vault.paths.decisionsDir;
    if (!(await fileExists(decisionsDir))) {
      return coverage;
    }
    const files = await readdir(decisionsDir);
    for (const file of files.filter((entry) => entry.endsWith(".md"))) {
      try {
        const text = await readFile(path.join(decisionsDir, file), "utf8");
        const parsed = parseMarkdownEntry<Record<string, unknown>>(text);
        const relatedFiles = Array.isArray(parsed.data.relatedFiles) ? parsed.data.relatedFiles : [];
        for (const related of relatedFiles) {
          if (typeof related === "string" && related.trim().length > 0) {
            coverage.add(related);
          }
        }
      } catch {
        continue;
      }
    }
    return coverage;
  }

  private async nextSessionSequence(date: Date): Promise<number> {
    const prefix = `session-${date.toISOString().slice(0, 10)}-`;
    const sessionsDir = this.vault.paths.sessionsDir;
    if (!(await fileExists(sessionsDir))) {
      return 1;
    }
    const files = await readdir(sessionsDir);
    const matches = files
      .filter((file) => file.startsWith(prefix) && file.endsWith(".md"))
      .map((file) => parseSequence(file) ?? 0);
    return (matches.length > 0 ? Math.max(...matches) : 0) + 1;
  }

  private async bootstrapFromGit(): Promise<{ enabled: boolean; summary: string[] }> {
    if (!this.git || this.config.allowGitBootstrap === false || !this.gitAvailable) {
      return { enabled: false, summary: [] };
    }
    try {
      const log = await this.git.log({
        maxCount: 100,
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      const summary = log.all.slice(0, 10).map((entry) => `${entry.date} ${entry.message}`);
      return { enabled: true, summary };
    } catch {
      return { enabled: false, summary: [] };
    }
  }

  async startSession(options: StartSessionOptions = {}): Promise<SessionRecord> {
    if (this.session && this.session.status === "active") {
      if (!this.latestAnalysis) {
        this.trackedFiles = await readWorkspaceFiles(this.projectRoot);
        this.latestAnalysis = this.analyzeCurrentWorkspace();
        this.applyAnalysisToSession(this.latestAnalysis);
      }
      if (!this.currentBootstrapPrompt) {
        this.currentBootstrapPrompt = await this.generateBootstrapPrompt();
      }
      return this.session;
    }
    const trigger = options.trigger ?? "manual";
    const mode = options.mode ?? this.sessionMode;
    const workspaceFiles = await readWorkspaceFiles(this.projectRoot);
    this.trackedFiles = workspaceFiles;
    this.fileHistory = [];
    this.decisions = [];
    this.latestAnalysis = null;
    const gitBootstrap = await this.bootstrapFromGit();
    const date = this.now();
    const sequence = await this.nextSessionSequence(date);
    const session: SessionRecord = {
      id: sessionIdFromDate(date, sequence),
      projectPath: this.projectRoot,
      startedAt: isoNow(this.now),
      trigger,
      mode,
      status: "active" as const,
      gitEnabled: gitBootstrap.enabled,
      filesObserved: workspaceFiles.length,
      filesChanged: 0,
      decisionsLogged: 0,
      contradictionsOpen: 0,
      findingsOpen: 0,
      healthScoreStart: this.previousScore,
      healthScoreEnd: this.previousScore,
      summary: gitBootstrap.summary.slice(0, 3).join(" | ")
    };
    if (gitBootstrap.enabled) {
      session.gitBootstrapRange = "last-30-days-or-100-commits";
    }

    this.session = session;
    await this.vault.saveSessionRecord(session);
    const analysis = this.analyzeCurrentWorkspace();
    this.latestAnalysis = analysis;
    this.applyAnalysisToSession(analysis);
    const bootstrap = await this.generateBootstrapPrompt();
    await this.vault.saveBootstrapPrompt(bootstrap);
    this.currentBootstrapPrompt = bootstrap;
    this.emit(SENTINEL_EVENTS.BOOTSTRAP_UPDATED, bootstrap);
    this.emit(SENTINEL_EVENTS.SESSION_STARTED, session);
    return session;
  }

  private analyzeCurrentWorkspace(): WorkspaceAnalysis {
    if (!this.session) {
      throw new Error("Session has not been started.");
    }
    const previousKeys = new Set(this.activeContradictions.map((item) => this.contradictionKey(item)));
    const analysis = analyzeWorkspace({
      session: this.session,
      config: this.config,
      files: this.trackedFiles,
      previousScore: this.previousScore,
      previousContradictions: this.getAllOpenContradictions(),
      filesWithDecisions: this.decisionCoverageFiles.size
    });
    const overridden = this.applyOverrides(analysis.contradictions);
    const merged = this.mergeContradictions(this.activeContradictions, overridden, this.fileHistory);
    for (const contradiction of merged) {
      const key = this.contradictionKey(contradiction);
      if (contradiction.status !== "resolved" && !previousKeys.has(key)) {
        this.emit(SENTINEL_EVENTS.CONTRADICTION_DETECTED, contradiction);
        void this.vault.saveContradiction(contradiction);
      }
    }
    this.activeContradictions = merged;
    return {
      ...analysis,
      contradictions: merged
    };
  }

  private contradictionKey(item: Pick<ContradictionRecord, "title" | "relatedFiles">): string {
    return `${item.title}::${[...item.relatedFiles].sort().join("|")}`;
  }

  private applyOverrides(contradictions: ContradictionRecord[]): ContradictionRecord[] {
    return contradictions.map((item) => {
      const matched = this.overrides.find((override) => {
        const needle = override.rule.toLowerCase();
        return item.title.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle);
      });
      if (!matched) {
        return item;
      }
      return {
        ...item,
        status: "resolved",
        resolvedAt: isoNow(this.now),
        resolutionNote: `Resolved by project override: ${matched.reason}`
      };
    });
  }

  private mergeContradictions(previous: ContradictionRecord[], current: ContradictionRecord[], fileHistory: SessionFileChange[]): ContradictionRecord[] {
    const changedFiles = new Set(fileHistory.map((item) => item.path));
    const currentWithPartial = current.map((item) => {
      const touched = item.relatedFiles.some((file) => changedFiles.has(file));
      if (item.status !== "resolved" && touched && previous.some((entry) => this.contradictionKey(entry) === this.contradictionKey(item))) {
        return {
          ...item,
          status: "partially-addressed" as const
        };
      }
      return item;
    });
    const currentKeys = new Set(currentWithPartial.map((item) => this.contradictionKey(item)));
    const merged: ContradictionRecord[] = [...currentWithPartial];

    for (const item of previous) {
      const key = this.contradictionKey(item);
      if (currentKeys.has(key)) {
        continue;
      }
      const override = this.overrides.find((entry) => item.title.toLowerCase().includes(entry.rule.toLowerCase()));
      const touched = item.relatedFiles.some((file) => changedFiles.has(file));
      const nextItem: ContradictionRecord = {
        ...item,
        status: override ? "resolved" : touched ? "resolved" : item.status
      };
      if (override || touched) {
        nextItem.resolvedAt = isoNow(this.now);
      } else if (item.resolvedAt) {
        nextItem.resolvedAt = item.resolvedAt;
      }
      if (override) {
        nextItem.resolutionNote = `Resolved by project override: ${override.reason}`;
      } else if (touched) {
        nextItem.resolutionNote = "Automatically resolved after related file changed.";
      } else if (item.resolutionNote) {
        nextItem.resolutionNote = item.resolutionNote;
      }
      merged.push(nextItem);
    }

    return merged;
  }

  private applyAnalysisToSession(analysis: WorkspaceAnalysis): void {
    if (!this.session) {
      return;
    }
    this.session.filesObserved = analysis.files.length;
    this.session.filesChanged = new Set(this.fileHistory.map((item) => item.path)).size;
    this.session.decisionsLogged = this.decisions.length;
    this.session.findingsOpen = analysis.findings.length;
    this.session.contradictionsOpen = analysis.contradictions.filter((item) => item.status !== "resolved").length;
    this.session.healthScoreEnd = analysis.healthScore.total;
  }

  private getAllOpenContradictions(): ContradictionRecord[] {
    return this.previousReports.flatMap((report) => report.contradictions).filter((item) => item.status !== "resolved");
  }

  async captureFileSave(filePath: string): Promise<WorkspaceState | null> {
    if (!this.session) {
      return null;
    }
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(this.projectRoot, filePath);
    if (!isPathWithinRoot(this.projectRoot, absolute)) {
      return null;
    }
    const relative = relativePath(this.projectRoot, absolute);
    try {
      const content = await readFile(absolute, "utf8");
      const existing = this.trackedFiles.findIndex((item) => item.path === relative);
      const snapshot = { path: relative, content };
      if (existing >= 0) {
        this.trackedFiles[existing] = snapshot;
      } else {
        this.trackedFiles.push(snapshot);
      }
      this.fileHistory.push({
        path: relative,
        status: "modified",
        summary: content.split(/\r?\n/).slice(0, 2).join(" ").slice(0, 160)
      });
      const analysis = this.analyzeCurrentWorkspace();
      this.latestAnalysis = analysis;
      this.applyAnalysisToSession(analysis);
      this.emit(SENTINEL_EVENTS.WORKSPACE_UPDATED, analysis);
      return this.buildWorkspaceState();
    } catch {
      return null;
    }
  }

  async endSession(summary?: string): Promise<SessionRecord | null> {
    if (!this.session) {
      return null;
    }
    const analysis = this.latestAnalysis ?? this.analyzeCurrentWorkspace();
    this.applyAnalysisToSession(analysis);
    this.session.status = "ended";
    this.session.endedAt = isoNow(this.now);
    if (summary !== undefined) {
      this.session.summary = summary;
    }
    this.session.healthScoreEnd = analysis.healthScore.total;
    this.previousScore = analysis.healthScore.total;
    await this.vault.saveProjectSnapshot(this.session.id, this.fileHistory);
    await this.vault.saveSessionRecord(this.session);
    const report = await this.buildSessionReport(analysis);
    await this.vault.saveReport(report);
    this.previousReports.push(report);
    this.previousScore = report.healthScore.total;
    this.emit(SENTINEL_EVENTS.REPORT_GENERATED, report);
    this.emit(SENTINEL_EVENTS.SESSION_ENDED, this.session);
    return this.session;
  }

  async buildSessionReport(analysis: WorkspaceAnalysis): Promise<SessionReport> {
    if (!this.session) {
      throw new Error("Session has not been started.");
    }
    const resolvedContradictions = analysis.contradictions.map((item) => ({
      ...item,
      status: item.status
    }));
    const report: SessionReport = {
      session: this.session,
      filesChanged: this.fileHistory,
      decisions: this.decisions,
      contradictions: resolvedContradictions,
      findings: analysis.findings,
      healthScore: analysis.healthScore,
      nextStep: this.deriveNextStep(analysis),
      bootstrapPrompt: await this.generateBootstrapPrompt(analysis),
      generatedAt: isoNow(this.now)
    };
    return report;
  }

  private deriveNextStep(analysis: WorkspaceAnalysis): string {
    if (analysis.contradictions.some((item) => item.severity === "critical")) {
      return "Resolve the critical contradiction before expanding the affected area.";
    }
    if (analysis.findings.some((item) => item.severity === "critical")) {
      return "Address the critical bad-practice issue before adding new functionality.";
    }
    return "Continue with the next planned change while keeping the current architecture consistent.";
  }

  async generateBootstrapPrompt(analysis: WorkspaceAnalysis = this.latestAnalysis ?? this.analyzeCurrentWorkspace()): Promise<string> {
    const report = this.previousReports.at(-1);
    const recentSummary = report
      ? [
          `Last health score: ${report.healthScore.total}`,
          `Open contradictions: ${report.contradictions.filter((item) => item.status !== "resolved").length}`,
          `Findings: ${report.findings.length}`
        ].join("\n")
      : "No prior session summary available.";

    const openContradictions = analysis.contradictions
      .filter((item) => item.status !== "resolved")
      .slice(0, 5)
      .map((item) => `- [${item.severity}] ${item.title}`);

    const fileTree = buildFileTree(this.trackedFiles);
    const templateText = this.config.promptTemplate && this.config.promptTemplate.trim().length > 0
      ? this.config.promptTemplate.trim()
      : "";

    const lines = [
      `# Sentinel Bootstrap Prompt`,
      ``,
      `Project summary: ${this.config.productDescription || "Unspecified project"}`,
      `Stack: ${(this.config.stack.length > 0 ? this.config.stack.join(", ") : "Unspecified")}`,
      `Preferred libraries: ${(this.config.preferredLibraries.length > 0 ? this.config.preferredLibraries.join(", ") : "None")}`,
      `Project rules: ${(this.config.requirements.length > 0 ? this.config.requirements.join(" | ") : "None")}`,
      `Design rules: ${(this.config.designRules.length > 0 ? this.config.designRules.join(" | ") : "None")}`,
      `Anti-patterns: ${(this.config.antiPatterns.length > 0 ? this.config.antiPatterns.join(" | ") : "None")}`,
      `Carry-over rules: ${(this.config.carryOverRules.length > 0 ? this.config.carryOverRules.join(" | ") : "None")}`,
      ``,
      `Current file structure:`,
      fileTree,
      ``,
      `Recent session summary:`,
      recentSummary,
      ``,
      `Open contradictions:`,
      openContradictions.length > 0 ? openContradictions.join("\n") : "- None",
      ``,
      `Suggested next step: ${this.deriveNextStep(analysis)}`
    ];

    if (templateText.length > 0) {
      lines.splice(2, 0, `Prompt template override:`);
      lines.splice(3, 0, templateText);
    }

    return lines.join("\n").trim() + "\n";
  }

  buildWorkspaceState(): WorkspaceState | null {
    if (!this.session || !this.latestAnalysis) {
      return null;
    }
    return {
      files: this.latestAnalysis.files,
      findings: this.latestAnalysis.findings,
      contradictions: this.latestAnalysis.contradictions,
      decisions: this.decisions,
      session: this.session,
      healthScore: this.latestAnalysis.healthScore
    };
  }

  async copyBootstrapToClipboardText(): Promise<string> {
    if (!this.session) {
      await this.startSession({ trigger: "auto" });
    }
    const bootstrap = this.currentBootstrapPrompt || await this.generateBootstrapPrompt();
    await this.vault.saveBootstrapPrompt(bootstrap);
    this.currentBootstrapPrompt = bootstrap;
    this.emit(SENTINEL_EVENTS.BOOTSTRAP_UPDATED, bootstrap);
    return bootstrap;
  }

  getStatus(): {
    session: SessionRecord | null;
    score: HealthScoreSnapshot | null;
    files: number;
    gitAvailable: boolean;
    notice: string;
    bootstrapPrompt: string;
    openContradictions: ContradictionRecord[];
    findings: FindingRecord[];
    decisions: DecisionRecord[];
    reportCount: number;
  } {
    return {
      session: this.session,
      score: this.latestAnalysis?.healthScore ?? null,
      files: this.trackedFiles.length,
      gitAvailable: this.gitAvailable,
      notice: this.gitAvailable
        ? "Git history enabled."
        : "No git history found. Sentinel is learning from this session forward.",
      bootstrapPrompt: this.currentBootstrapPrompt,
      openContradictions: this.latestAnalysis?.contradictions.filter((item) => item.status !== "resolved") ?? [],
      findings: this.latestAnalysis?.findings ?? [],
      decisions: this.decisions,
      reportCount: this.previousReports.length
    };
  }

  async resetSession(): Promise<void> {
    this.session = null;
    this.latestAnalysis = null;
    this.trackedFiles = [];
    this.fileHistory = [];
    this.decisions = [];
    this.currentBootstrapPrompt = "";
  }

  async initProject(templateName?: string, customConfig: Partial<ProjectConfig> = {}): Promise<void> {
    await this.vault.ensureProjectStructure();
    const template = STACK_TEMPLATES.find((item) => item.name === templateName) ?? STACK_TEMPLATES[STACK_TEMPLATES.length - 1];
    this.config = {
      ...defaultProjectConfig(),
      productDescription: customConfig.productDescription ?? this.config.productDescription ?? "",
      stack: customConfig.stack ?? (template?.name && template.name !== "Blank" ? [template.name] : []),
      preferredLibraries: customConfig.preferredLibraries ?? template?.preferredLibraries ?? [],
      antiPatterns: customConfig.antiPatterns ?? template?.antiPatterns ?? [],
      designRules: customConfig.designRules ?? template?.designRules ?? [],
      requirements: customConfig.requirements ?? template?.requirements ?? [],
      carryOverRules: customConfig.carryOverRules ?? template?.carryOverRules ?? [],
      promptTemplate: customConfig.promptTemplate ?? this.config.promptTemplate ?? "",
      defaultMode: customConfig.defaultMode ?? this.config.defaultMode ?? "passive",
      allowGitBootstrap: customConfig.allowGitBootstrap ?? this.config.allowGitBootstrap ?? true,
      allowFileWatcherFallback: customConfig.allowFileWatcherFallback ?? this.config.allowFileWatcherFallback ?? true
    };
    await saveProjectConfig(this.configPath, this.config);
    await this.vault.initializeProjectFiles(this.config, []);
    await this.writeClaudeDesktopConfig(path.join(this.projectRoot, ".sentinel", "claude_desktop_config.json"));
  }

  async logDecision(input: { title: string; summary: string; reason: string; relatedFiles?: string[]; source?: SourceKind }): Promise<DecisionRecord | null> {
    if (!this.session) {
      return null;
    }
    const record: DecisionRecord = {
      id: `${this.session.id}-decision-${String(this.decisions.length + 1).padStart(3, "0")}`,
      sessionId: this.session.id,
      projectPath: this.projectRoot,
      title: input.title,
      summary: input.summary,
      reason: input.reason,
      source: input.source ?? "user",
      relatedFiles: input.relatedFiles ?? [],
      createdAt: isoNow(this.now)
    };
    this.decisions.push(record);
    this.session.decisionsLogged = this.decisions.length;
    for (const file of record.relatedFiles) {
      this.decisionCoverageFiles.add(file);
    }
    await this.vault.saveDecision(record);
    this.emit(SENTINEL_EVENTS.VAULT_UPDATED, record);
    return record;
  }

  async addOverride(rule: string, reason: string): Promise<OverrideRule> {
    const override: OverrideRule = {
      rule,
      reason,
      added: isoNow(this.now)
    };
    this.overrides = [...this.overrides, override];
    await this.vault.saveOverrides(this.overrides);
    this.emit(SENTINEL_EVENTS.VAULT_UPDATED, override);
    return override;
  }

  async markContradictionResolved(title: string, note: string): Promise<void> {
    if (!this.session) {
      return;
    }
    this.activeContradictions = this.activeContradictions.map((item) =>
      item.id === title || item.title === title
        ? {
            ...item,
            status: "resolved",
            resolvedAt: isoNow(this.now),
            resolutionNote: note
          }
        : item
    );
    this.latestAnalysis = this.latestAnalysis
      ? {
          ...this.latestAnalysis,
          contradictions: this.activeContradictions
        }
      : this.latestAnalysis;
    this.emit(SENTINEL_EVENTS.CONTRADICTION_RESOLVED, title);
  }

  async syncGlobalVault(targetDir: string): Promise<void> {
    await this.vault.ensureGlobalStructure();
    await mkdir(targetDir, { recursive: true });
    await this.copyDirectory(this.vault.globalPaths.root, targetDir);
  }

  async writeClaudeDesktopConfig(targetPath: string): Promise<void> {
    const payload = JSON.stringify(this.mcpHub.toClaudeDesktopConfig(), null, 2);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, payload, "utf8");
  }

  async updateBootstrapPrompt(content: string): Promise<string> {
    await this.vault.saveBootstrapPrompt(content);
    this.currentBootstrapPrompt = content;
    this.emit(SENTINEL_EVENTS.BOOTSTRAP_UPDATED, content);
    return content;
  }

  async regenerateBootstrapPrompt(): Promise<string> {
    if (this.currentBootstrapPrompt.trim().length > 0) {
      const backupName = `bootstrap-backup-${this.now().toISOString().slice(0, 10)}.md`;
      await writeFile(path.join(this.projectRoot, ".sentinel", backupName), this.currentBootstrapPrompt, "utf8");
    }
    const bootstrap = await this.generateBootstrapPrompt();
    return this.updateBootstrapPrompt(bootstrap);
  }

  private async copyDirectory(sourceDir: string, targetDir: string): Promise<void> {
    await mkdir(targetDir, { recursive: true });
    const entries = await readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      const from = path.join(sourceDir, entry.name);
      const to = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirectory(from, to);
      } else {
        await copyFile(from, to);
      }
    }
  }
}
