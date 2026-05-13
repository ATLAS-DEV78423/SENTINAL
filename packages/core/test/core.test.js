import assert from "node:assert/strict";
import test from "node:test";
import { buildSessionReportMarkdown } from "../dist/report.js";
import { computeHealthScore } from "../dist/score.js";
import { defaultProjectConfig, normalizeProjectConfig, parseProjectConfig, stringifyProjectConfig } from "../dist/config.js";
import { parseMarkdownEntry, stringifyMarkdownEntry } from "../dist/frontmatter.js";

test("project config and markdown helpers round-trip cleanly", () => {
  const input = normalizeProjectConfig({
    productDescription: "Demo app",
    stack: ["TypeScript"],
    preferredLibraries: ["react"],
    healthScore: { consistencyWeight: 0.3 }
  });

  assert.equal(defaultProjectConfig().defaultMode, "passive");
  assert.equal(input.productDescription, "Demo app");
  assert.deepEqual(input.stack, ["TypeScript"]);
  assert.equal(input.healthScore?.consistencyWeight, 0.3);

  const yaml = stringifyProjectConfig(input);
  const parsed = parseProjectConfig(yaml);
  assert.deepEqual(parsed, input);

  const entry = stringifyMarkdownEntry({ id: "abc", nested: ["one"] }, "# Hello");
  const roundTrip = parseMarkdownEntry(entry);
  assert.deepEqual(roundTrip.data, { id: "abc", nested: ["one"] });
  assert.equal(roundTrip.content.trim(), "# Hello");
});

test("health scoring and report rendering stay stable", () => {
  const score = computeHealthScore({
    unresolvedContradictions: 0,
    criticalContradictions: 0,
    warnings: 0,
    badPracticeFindings: 0,
    totalFiles: 1,
    filesWithDecisions: 0,
    consistencyRatio: 0,
    previousScore: 0
  });

  assert.equal(score.total, 59);
  assert.equal(score.delta, 59);
  assert.deepEqual(score.components, {
    contradiction: 100,
    badPractice: 100,
    consistency: 0,
    decisionCoverage: 0,
    sessionTrend: 50
  });

  const markdown = buildSessionReportMarkdown({
    session: {
      id: "session-2026-05-11-001",
      projectPath: "C:/work/sentinel",
      startedAt: "2026-05-11T00:00:00.000Z",
      endedAt: "2026-05-11T00:10:00.000Z",
      trigger: "manual",
      mode: "passive",
      status: "ended",
      gitEnabled: false,
      filesObserved: 1,
      filesChanged: 1,
      decisionsLogged: 0,
      contradictionsOpen: 0,
      findingsOpen: 0,
      healthScoreStart: 40,
      healthScoreEnd: 59
    },
    filesChanged: [{ path: "src/index.ts", status: "modified", summary: "initial commit" }],
    decisions: [],
    contradictions: [],
    findings: [],
    healthScore: score,
    nextStep: "Continue with the next planned change while keeping the current architecture consistent.",
    bootstrapPrompt: "# Sentinel Bootstrap Prompt\n",
    generatedAt: "2026-05-11T00:10:00.000Z"
  });

  assert.match(markdown, /# Session Report/);
  assert.match(markdown, /healthScore: 59/);
  assert.match(markdown, /src\/index\.ts: initial commit/);
});
