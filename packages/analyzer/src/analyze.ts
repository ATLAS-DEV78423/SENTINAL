import { computeHealthScore, FindingRecord, HealthScoreSnapshot, ProjectConfig, SessionRecord, FileSnapshot, ContradictionRecord } from "@sentinel/core";
import { detectBadPractices } from "./bad-practices.js";
import { detectContradictions } from "./contradictions.js";
import { summarizeFile } from "./summarize.js";

export interface WorkspaceAnalysisInput {
  session: SessionRecord;
  config: ProjectConfig;
  files: Array<{ path: string; content: string }>;
  previousScore?: number;
  previousContradictions?: ContradictionRecord[];
  filesWithDecisions?: number;
}

export interface WorkspaceAnalysis {
  files: FileSnapshot[];
  findings: FindingRecord[];
  contradictions: ContradictionRecord[];
  healthScore: HealthScoreSnapshot;
  consistencyRatio: number;
}

function estimateConsistencyRatio(files: FileSnapshot[]): number {
  if (files.length === 0) {
    return 1;
  }
  const styleCounts = new Map<string, number>();
  for (const file of files) {
    const style =
      file.exportedFunctions.every((fn: FileSnapshot["exportedFunctions"][number]) => /^[A-Z]/.test(fn.name)) ? "pascal" :
      file.exportedFunctions.every((fn: FileSnapshot["exportedFunctions"][number]) => /^[a-z]/.test(fn.name)) ? "camel" :
      "mixed";
    styleCounts.set(style, (styleCounts.get(style) ?? 0) + 1);
  }
  const largest = Math.max(...styleCounts.values());
  return largest / files.length;
}

export function analyzeWorkspace(input: WorkspaceAnalysisInput): WorkspaceAnalysis {
  const files = input.files.map((file) => summarizeFile(file.path, file.content));
  let findingIndex = 0;
  const findings = files.flatMap((file) => {
    const results = detectBadPractices(input.session.id, input.session.projectPath, file, input.config, findingIndex);
    findingIndex += results.length;
    return results;
  });
  const contradictions = detectContradictions(
    input.session.id,
    input.session.projectPath,
    files,
    input.previousContradictions ?? []
  );
  const consistencyRatio = estimateConsistencyRatio(files);
  const healthScore = computeHealthScore({
    unresolvedContradictions: contradictions.filter((item) => item.status !== "resolved").length,
    criticalContradictions: contradictions.filter((item) => item.severity === "critical" && item.status !== "resolved").length,
    warnings: contradictions.filter((item) => item.severity === "warning" && item.status !== "resolved").length,
    badPracticeFindings: findings.filter((item) => item.category !== "info").length,
    totalFiles: files.length,
    filesWithDecisions: input.filesWithDecisions ?? 0,
    consistencyRatio,
    previousScore: input.previousScore ?? 0
  });

  return {
    files,
    findings,
    contradictions,
    healthScore,
    consistencyRatio
  };
}
