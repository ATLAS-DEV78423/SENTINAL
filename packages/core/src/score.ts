import { DEFAULT_SCORE_WEIGHTS } from "./constants.js";
import { HealthScoreComponents, HealthScoreSnapshot } from "./types.js";

export interface HealthScoreInput {
  unresolvedContradictions: number;
  criticalContradictions: number;
  warnings: number;
  badPracticeFindings: number;
  totalFiles: number;
  filesWithDecisions: number;
  consistencyRatio: number;
  previousScore: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value);
}

function scaledPenalty(value: number, scale: number, maxPenalty = 100): number {
  return clamp(value * scale, 0, maxPenalty);
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreSnapshot {
  const contradictionPenalty = clamp(
    input.criticalContradictions * 35 + input.unresolvedContradictions * 12 + input.warnings * 4,
    0,
    100
  );

  const badPracticePenalty = clamp(
    scaledPenalty(input.badPracticeFindings / Math.max(input.totalFiles, 1), 180),
    0,
    100
  );

  const consistencyScore = clamp(round(input.consistencyRatio * 100), 0, 100);
  const decisionCoverageScore = clamp(
    round((input.filesWithDecisions / Math.max(input.totalFiles, 1)) * 100),
    0,
    100
  );

  const contradictionScore = 100 - contradictionPenalty;
  const badPracticeScore = 100 - badPracticePenalty;
  const subtotal = round(
    contradictionScore * DEFAULT_SCORE_WEIGHTS.contradiction +
      badPracticeScore * DEFAULT_SCORE_WEIGHTS.badPractice +
      consistencyScore * DEFAULT_SCORE_WEIGHTS.consistency +
      decisionCoverageScore * DEFAULT_SCORE_WEIGHTS.decisionCoverage
  );
  const sessionTrendScore = input.previousScore === 0
    ? 50
    : clamp(50 + round((subtotal - input.previousScore) / 2), 0, 100);

  const components: HealthScoreComponents = {
    contradiction: contradictionScore,
    badPractice: badPracticeScore,
    consistency: consistencyScore,
    decisionCoverage: decisionCoverageScore,
    sessionTrend: sessionTrendScore
  };

  const total = round(subtotal * (1 - DEFAULT_SCORE_WEIGHTS.sessionTrend) + components.sessionTrend * DEFAULT_SCORE_WEIGHTS.sessionTrend);

  return {
    total: clamp(total, 0, 100),
    previous: clamp(input.previousScore, 0, 100),
    delta: clamp(total, 0, 100) - clamp(input.previousScore, 0, 100),
    components,
    componentDetails: {
      contradiction: [
        `Critical contradictions: ${input.criticalContradictions}`,
        `Open contradictions: ${input.unresolvedContradictions}`
      ],
      badPractice: [`Flagged findings: ${input.badPracticeFindings}`],
      consistency: [`Consistency ratio: ${Math.round(input.consistencyRatio * 100)}%`],
      decisionCoverage: [`Files with decisions: ${input.filesWithDecisions}/${Math.max(input.totalFiles, 1)}`],
      sessionTrend: [`Previous session score: ${input.previousScore}`]
    },
    trend: [input.previousScore, clamp(total, 0, 100)]
  };
}
