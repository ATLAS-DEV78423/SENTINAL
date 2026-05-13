import { stringifyMarkdownEntry } from "./frontmatter.js";
import { SessionReport } from "./types.js";

export function buildSessionReportMarkdown(report: SessionReport): string {
  const frontmatter = {
    id: report.session.id,
    projectPath: report.session.projectPath,
    startedAt: report.session.startedAt,
    endedAt: report.session.endedAt ?? report.generatedAt,
    healthScore: report.healthScore.total
  };

  const body = [
    `# Session Report`,
    ``,
    `## Summary`,
    `- Session: ${report.session.id}`,
    `- Project: ${report.session.projectPath}`,
    `- Health score start: ${report.session.healthScoreStart}`,
    `- Health score end: ${report.healthScore.total}`,
    `- Delta: ${report.healthScore.delta}`,
    ``,
    `## Files Changed`,
    ...report.filesChanged.map((file) => `- ${file.path}: ${file.summary}`),
    ``,
    `## Decisions`,
    ...report.decisions.map((decision) => `- ${decision.title}: ${decision.summary}`),
    ``,
    `## Contradictions`,
    ...report.contradictions.map((contradiction) => `- [${contradiction.severity}] ${contradiction.title} (${contradiction.status})`),
    ``,
    `## Findings`,
    ...report.findings.map((finding) => `- [${finding.severity}] ${finding.title}`),
    ``,
    `## Next Step`,
    report.nextStep,
    ``,
    `## Bootstrap Prompt`,
    "```md",
    report.bootstrapPrompt,
    "```"
  ].join("\n");

  return stringifyMarkdownEntry(frontmatter, body);
}

