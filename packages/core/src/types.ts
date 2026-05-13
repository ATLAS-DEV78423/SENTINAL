export type Severity = "info" | "warning" | "critical";
export type SessionMode = "passive" | "active" | "interventionist";
export type SessionStatus = "idle" | "active" | "ended";
export type SessionTrigger = "manual" | "auto" | "resume" | "file-save" | "git-bootstrap";
export type SourceKind = "file" | "git" | "config" | "wizard" | "user" | "llm";

export interface ProjectConfig {
  productDescription: string;
  stack: string[];
  preferredLibraries: string[];
  antiPatterns: string[];
  designRules: string[];
  requirements: string[];
  carryOverRules: string[];
  promptTemplate?: string;
  defaultMode?: SessionMode;
  allowGitBootstrap?: boolean;
  allowFileWatcherFallback?: boolean;
  healthScore?: {
    contradictionWeight?: number;
    badPracticeWeight?: number;
    consistencyWeight?: number;
    decisionCoverageWeight?: number;
    sessionTrendWeight?: number;
  };
}

export interface OverrideRule {
  rule: string;
  reason: string;
  added: string;
}

export interface SessionRecord {
  id: string;
  projectPath: string;
  startedAt: string;
  endedAt?: string;
  trigger: SessionTrigger;
  mode: SessionMode;
  status: SessionStatus;
  gitEnabled: boolean;
  gitBootstrapRange?: string;
  filesObserved: number;
  filesChanged: number;
  decisionsLogged: number;
  contradictionsOpen: number;
  findingsOpen: number;
  healthScoreStart: number;
  healthScoreEnd: number;
  summary?: string;
  bootstrapPath?: string;
}

export interface DecisionRecord {
  id: string;
  sessionId: string;
  projectPath: string;
  title: string;
  summary: string;
  reason: string;
  source: SourceKind;
  relatedFiles: string[];
  createdAt: string;
}

export interface ContradictionRecord {
  id: string;
  sessionId: string;
  projectPath: string;
  title: string;
  description: string;
  severity: Severity;
  status: "open" | "partially-addressed" | "resolved";
  evidence: string[];
  relatedFiles: string[];
  detectedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  source: SourceKind;
}

export interface FindingRecord {
  id: string;
  sessionId: string;
  projectPath: string;
  title: string;
  description: string;
  severity: Severity;
  category: "bad-practice" | "contradiction" | "consistency" | "security" | "info";
  evidence: string[];
  relatedFiles: string[];
  createdAt: string;
}

export interface PatternRecord {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  projectsSeen: string[];
  sessionsSeen: string[];
  createdAt: string;
  updatedAt: string;
  confirmed: boolean;
}

export interface SessionFileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  summary: string;
  before?: string;
  after?: string;
  hashBefore?: string;
  hashAfter?: string;
}

export interface ToolEventRecord {
  id: string;
  sessionId: string;
  projectPath: string;
  tool: string;
  requestSummary: string;
  responseSummary: string;
  createdAt: string;
}

export interface FileSnapshot {
  path: string;
  language: string;
  content: string;
  lineCount: number;
  exportedFunctions: ExportedFunction[];
  interfaces: InterfaceShape[];
  imports: string[];
  usesAsyncAwait: boolean;
  usesCallbacks: boolean;
  hasSecrets: boolean;
  nestedDepth: number;
  functionCount: number;
  summary: string;
}

export interface ExportedFunction {
  name: string;
  signature: string;
  async: boolean;
  parameters: number;
}

export interface InterfaceShape {
  name: string;
  fields: string[];
}

export interface HealthScoreComponents {
  contradiction: number;
  badPractice: number;
  consistency: number;
  decisionCoverage: number;
  sessionTrend: number;
}

export interface HealthScoreSnapshot {
  total: number;
  previous: number;
  delta: number;
  components: HealthScoreComponents;
  componentDetails: Record<keyof HealthScoreComponents, string[]>;
  trend: number[];
}

export interface WorkspaceState {
  files: FileSnapshot[];
  findings: FindingRecord[];
  contradictions: ContradictionRecord[];
  decisions: DecisionRecord[];
  session: SessionRecord;
  healthScore: HealthScoreSnapshot;
}

export interface SessionReport {
  session: SessionRecord;
  filesChanged: SessionFileChange[];
  decisions: DecisionRecord[];
  contradictions: ContradictionRecord[];
  findings: FindingRecord[];
  healthScore: HealthScoreSnapshot;
  nextStep: string;
  bootstrapPrompt: string;
  generatedAt: string;
}

