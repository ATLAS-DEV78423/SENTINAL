import assert from "node:assert/strict";
import test from "node:test";
import { summarizeFile, isBuiltinImport } from "../dist/summarize.js";
import { detectBadPractices } from "../dist/bad-practices.js";
import { detectContradictions } from "../dist/contradictions.js";
import { analyzeWorkspace } from "../dist/analyze.js";

test("summarizeFile handles empty content", () => {
  const result = summarizeFile("src/empty.ts", "");
  assert.equal(result.path, "src/empty.ts");
  assert.equal(result.lineCount, 0);
  assert.equal(result.language, "typescript");
  assert.deepEqual(result.exportedFunctions, []);
  assert.deepEqual(result.interfaces, []);
  assert.deepEqual(result.imports, []);
  assert.equal(result.nestedDepth, 0);
  assert.equal(result.functionCount, 0);
  assert.equal(result.hasSecrets, false);
});

test("summarizeFile detects language from extension", () => {
  assert.equal(summarizeFile("file.ts", "").language, "typescript");
  assert.equal(summarizeFile("file.tsx", "").language, "typescript");
  assert.equal(summarizeFile("file.js", "").language, "javascript");
  assert.equal(summarizeFile("file.jsx", "").language, "javascript");
  assert.equal(summarizeFile("file.md", "").language, "markdown");
  assert.equal(summarizeFile("file.json", "").language, "json");
  assert.equal(summarizeFile("file.yml", "").language, "yaml");
  assert.equal(summarizeFile("file.yaml", "").language, "yaml");
  assert.equal(summarizeFile("file.txt", "").language, "text");
  assert.equal(summarizeFile("Makefile", "").language, "text");
});

test("summarizeFile extracts imports correctly", () => {
  const code = `
import { readFile } from "node:fs/promises";
import path from "node:path";
import { computeHealthScore } from "@sentinel/core";
import { mock, test } from "node:test";
import("./dynamic.js");
const local = require("./utils.js");
`;
  const result = summarizeFile("src/importer.ts", code);
  assert.ok(result.imports.includes("node:fs/promises"));
  assert.ok(result.imports.includes("node:path"));
  assert.ok(result.imports.includes("@sentinel/core"));
  assert.ok(result.imports.includes("node:test"));
  assert.ok(result.imports.includes("./dynamic.js"));
  assert.ok(!result.imports.includes("./utils.js"));
});

test("summarizeFile extracts exported functions", () => {
  const code = `
export function greet(name) { return "Hello " + name; }

export const add = (a, b) => a + b;

export const multiply = async function(a, b) { return a * b; };

export async function fetchData(url) { return await get(url); }
`;
  const result = summarizeFile("src/funcs.ts", code);
  const names = result.exportedFunctions.map((f) => f.name);
  assert.ok(names.includes("greet"));
  assert.ok(names.includes("add"));
  assert.ok(names.includes("multiply"));
  assert.ok(names.includes("fetchData"));

  const greet = result.exportedFunctions.find((f) => f.name === "greet");
  assert.equal(greet.async, false);
  assert.equal(greet.parameters, 1);

  const fetchData = result.exportedFunctions.find((f) => f.name === "fetchData");
  assert.equal(fetchData.async, true);
  assert.equal(fetchData.parameters, 1);
});

test("summarizeFile extracts interfaces", () => {
  const code = `
export interface User {
  id: string;
  name: string;
  email: string;
}

interface Config {
  host: string;
  port: number;
}
`;
  const result = summarizeFile("src/types.ts", code);
  const names = result.interfaces.map((i) => i.name);
  assert.ok(names.includes("User"));
  assert.ok(names.includes("Config"));

  const user = result.interfaces.find((i) => i.name === "User");
  assert.ok(user.fields.includes("id"));
  assert.ok(user.fields.includes("name"));
  assert.ok(user.fields.includes("email"));
});

test("summarizeFile detects secrets in content", () => {
  const withoutSecrets = summarizeFile("src/safe.ts", "const x = 42;");
  assert.equal(withoutSecrets.hasSecrets, false);

  const apiKey = summarizeFile("src/leak.ts", 'const api_key = "sk-12345678901234567890";');
  assert.equal(apiKey.hasSecrets, true);

  const secret = summarizeFile("src/leak2.ts", 'const secret = "supersecretvalue123";');
  assert.equal(secret.hasSecrets, true);

  const password = summarizeFile("src/leak3.ts", 'const password = "hunter2!";');
  assert.equal(password.hasSecrets, true);

  const token = summarizeFile("src/leak4.ts", 'const token = "ghp_abcdefghijklmnop";');
  assert.equal(token.hasSecrets, true);

  const privateKey = summarizeFile("src/key.ts", "-----BEGIN RSA PRIVATE KEY-----");
  assert.equal(privateKey.hasSecrets, true);
});

test("summarizeFile computes nested depth", () => {
  const flat = "const a = 1;\nconst b = 2;\n";
  assert.equal(summarizeFile("flat.ts", flat).nestedDepth, 0);

  const nested = "if (true) {\n  if (true) {\n    if (true) {\n      return 1;\n    }\n  }\n}\n";
  assert.equal(summarizeFile("nested.ts", nested).nestedDepth, 3);
});

test("summarizeFile detects async and callback patterns", () => {
  const asyncOnly = 'const result = await fetch("/api");';
  const result = summarizeFile("async.ts", asyncOnly);
  assert.equal(result.usesAsyncAwait, true);
  assert.equal(result.usesCallbacks, false);

  const callbackOnly = 'fs.readFile(path, (err, data) => { callback(err); });';
  const result2 = summarizeFile("cb.ts", callbackOnly);
  assert.equal(result2.usesAsyncAwait, false);
  assert.equal(result2.usesCallbacks, true);
});

test("isBuiltinImport detects node builtins", () => {
  assert.equal(isBuiltinImport("node:fs"), true);
  assert.equal(isBuiltinImport("node:fs/promises"), true);
  assert.equal(isBuiltinImport("node:path"), true);
  assert.equal(isBuiltinImport("node:crypto"), true);
  assert.equal(isBuiltinImport("@sentinel/core"), false);
  assert.equal(isBuiltinImport("react"), false);
  assert.equal(isBuiltinImport("./local.js"), false);
});

test("detectBadPractices flags god functions", () => {
  const longContent = Array(150).fill("x = 1;").join("\n");
  const snapshot = summarizeFile("src/god.ts", longContent);
  const config = { productDescription: "test", stack: [], antiPatterns: [], preferredLibraries: [], designRules: [], requirements: [], carryOverRules: [] };
  const findings = detectBadPractices("session-1", "/project", snapshot, config, 0);
  const god = findings.find((f) => f.title === "Possible god function");
  assert.ok(god);
  assert.equal(god.severity, "warning");
});

test("detectBadPractices flags deep nesting >= 4 as warning, >= 5 as critical", () => {
  const nested4 = "if (a) {\n  if (b) {\n    if (c) {\n      if (d) {\n        return 1;\n      }\n    }\n  }\n}\n";
  const snapshot4 = summarizeFile("src/deep4.ts", nested4);
  assert.equal(snapshot4.nestedDepth, 4);
  const config = { productDescription: "test", stack: [], antiPatterns: [], preferredLibraries: [], designRules: [], requirements: [], carryOverRules: [] };
  const findings4 = detectBadPractices("session-1", "/project", snapshot4, config, 0);
  const deep4 = findings4.find((f) => f.title === "Deep nesting detected");
  assert.ok(deep4);
  assert.equal(deep4.severity, "warning");

  const nested5 = "if (a) {\n  if (b) {\n    if (c) {\n      if (d) {\n        if (e) {\n          return 1;\n        }\n      }\n    }\n  }\n}\n";
  const snapshot5 = summarizeFile("src/deep5.ts", nested5);
  assert.equal(snapshot5.nestedDepth, 5);
  const findings5 = detectBadPractices("session-1", "/project", snapshot5, config, 50);
  const deep5 = findings5.find((f) => f.title === "Deep nesting detected");
  assert.ok(deep5);
  assert.equal(deep5.severity, "critical");
  assert.ok(deep5.id.startsWith("bad-practice-"));
});

test("detectBadPractices flags TODO/FIXME overload", () => {
  const messy = Array(5).fill("TODO: fix this").join("\n") + "\n" + Array(3).fill("FIXME: broken").join("\n") + "\nconst x = 1;\n";
  const snapshot = summarizeFile("src/messy.ts", messy);
  const config = { productDescription: "test", stack: [], antiPatterns: [], preferredLibraries: [], designRules: [], requirements: [], carryOverRules: [] };
  const findings = detectBadPractices("session-1", "/project", snapshot, config, 0);
  const unfinished = findings.find((f) => f.title === "Mixed concerns or unfinished work");
  assert.ok(unfinished);
  assert.equal(unfinished.severity, "info");
});

test("detectBadPractices flags hardcoded secrets", () => {
  const snapshot = summarizeFile("src/leak.ts", 'const api_key = "sk-12345678901234567890";');
  const config = { productDescription: "test", stack: [], antiPatterns: [], preferredLibraries: [], designRules: [], requirements: [], carryOverRules: [] };
  const findings = detectBadPractices("session-1", "/project", snapshot, config, 0);
  const secret = findings.find((f) => f.title === "Hardcoded secret or credential");
  assert.ok(secret);
  assert.equal(secret.severity, "critical");
  assert.equal(secret.category, "security");
});

test("detectBadPractices flags external imports", () => {
  const code = 'import { something } from "some-npm-package";\n';
  const snapshot = summarizeFile("src/importer.ts", code);
  const config = { productDescription: "test", stack: [], antiPatterns: [], preferredLibraries: [], designRules: [], requirements: [], carryOverRules: [] };
  const findings = detectBadPractices("session-1", "/project", snapshot, config, 0);
  const external = findings.find((f) => f.title === "External import review needed");
  assert.ok(external);
  assert.equal(external.severity, "info");
});

test("detectBadPractices matches configured anti-patterns", () => {
  const code = "This code uses eval which is dangerous.";
  const snapshot = summarizeFile("src/eval.ts", code);
  const config = { productDescription: "test", stack: [], antiPatterns: ["eval"], preferredLibraries: [], designRules: [], requirements: [], carryOverRules: [] };
  const findings = detectBadPractices("session-1", "/project", snapshot, config, 0);
  const anti = findings.find((f) => f.title === "Configured anti-pattern match");
  assert.ok(anti);
  assert.equal(anti.severity, "warning");
});

test("detectContradictions finds function shape mismatches", () => {
  const files = [
    summarizeFile("src/a.ts", "export function greet(name: string): string { return 'Hello ' + name; }"),
    summarizeFile("src/b.ts", "export function greet(first: string, last: string): string { return first + ' ' + last; }")
  ];
  const contradictions = detectContradictions("session-1", "/project", files, []);
  const shape = contradictions.find((c) => c.title.includes("Function shape mismatch"));
  assert.ok(shape);
  assert.equal(shape.severity, "warning");
  assert.equal(shape.status, "open");
  assert.equal(shape.source, "file");
});

test("detectContradictions finds interface drift", () => {
  const files = [
    summarizeFile("src/a.ts", "export interface User {\n  id: string;\n  name: string;\n}"),
    summarizeFile("src/b.ts", "export interface User {\n  id: string;\n  name: string;\n  email: string;\n}")
  ];
  const contradictions = detectContradictions("session-1", "/project", files, []);
  const drift = contradictions.find((c) => c.title.includes("Data shape drift"));
  assert.ok(drift);
  assert.equal(drift.severity, "warning");
});

test("detectContradictions flags mixed async/callback in same file", () => {
  const files = [
    summarizeFile("src/mixed.ts", "const result = await fetch('/api');\nsomething.callback((err, data) => {});")
  ];
  const contradictions = detectContradictions("session-1", "/project", files, []);
  const mixed = contradictions.find((c) => c.title.includes("Async and callback styles mixed"));
  assert.ok(mixed);
  assert.equal(mixed.severity, "info");
});

test("detectContradictions deduplicates against previous entries", () => {
  const files = [
    summarizeFile("src/a.ts", "export function greet(name: string): string { return 'Hello ' + name; }"),
    summarizeFile("src/b.ts", "export function greet(first: string, last: string): string { return first + ' ' + last; }")
  ];
  const contradictions = detectContradictions("session-1", "/project", files, []);
  assert.equal(contradictions.length, 1);

  const empty = detectContradictions("session-2", "/project", files, contradictions);
  assert.equal(empty.length, 0);
});

test("detectContradictions returns empty for consistent files", () => {
  const files = [
    summarizeFile("src/a.ts", "export const x = 1;"),
    summarizeFile("src/b.ts", "export const y = 2;")
  ];
  const contradictions = detectContradictions("session-1", "/project", files, []);
  assert.equal(contradictions.length, 0);
});

test("analyzeWorkspace produces complete analysis", () => {
  const input = {
    session: { id: "session-1", projectPath: "/project", startedAt: new Date().toISOString(), trigger: "manual", mode: "passive", status: "active", gitEnabled: false, filesObserved: 2, filesChanged: 2, decisionsLogged: 0, contradictionsOpen: 0, findingsOpen: 0, healthScoreStart: 50, healthScoreEnd: 50 },
    config: { productDescription: "Test", stack: [], antiPatterns: ["eval"], preferredLibraries: [], designRules: [], requirements: [], carryOverRules: [] },
    files: [
      { path: "src/a.ts", content: "export function greet(name: string): string { return 'Hello ' + name; }" },
      { path: "src/b.ts", content: "// TODO: refactor this\n// FIXME: broken\nconst api_key = 'sk-12345678901234567890';" }
    ],
    previousScore: 50,
    previousContradictions: [],
    filesWithDecisions: 1
  };
  const analysis = analyzeWorkspace(input);
  assert.ok(Array.isArray(analysis.files));
  assert.equal(analysis.files.length, 2);
  assert.ok(Array.isArray(analysis.findings));
  assert.ok(analysis.findings.length > 0);
  assert.ok(analysis.healthScore);
  assert.equal(typeof analysis.healthScore.total, "number");
  assert.equal(typeof analysis.consistencyRatio, "number");
  assert.ok(analysis.consistencyRatio >= 0 && analysis.consistencyRatio <= 1);
});

test("analyzeWorkspace with no files has perfect consistency", () => {
  const input = {
    session: { id: "session-1", projectPath: "/project", startedAt: new Date().toISOString(), trigger: "manual", mode: "passive", status: "active", gitEnabled: false, filesObserved: 0, filesChanged: 0, decisionsLogged: 0, contradictionsOpen: 0, findingsOpen: 0, healthScoreStart: 100, healthScoreEnd: 100 },
    config: { productDescription: "Empty", stack: [], antiPatterns: [], preferredLibraries: [], designRules: [], requirements: [], carryOverRules: [] },
    files: []
  };
  const analysis = analyzeWorkspace(input);
  assert.equal(analysis.consistencyRatio, 1);
  assert.equal(analysis.files.length, 0);
  assert.equal(analysis.findings.length, 0);
  assert.equal(analysis.contradictions.length, 0);
});
