import { FindingRecord, Severity, FileSnapshot, ProjectConfig } from "@sentinel/core";
import { isBuiltinImport } from "./summarize.js";

function makeFinding(
  sessionId: string,
  projectPath: string,
  title: string,
  description: string,
  severity: Severity,
  category: FindingRecord["category"],
  evidence: string[],
  relatedFiles: string[],
  index: number
): FindingRecord {
  return {
    id: `${category}-${index}`,
    sessionId,
    projectPath,
    title,
    description,
    severity,
    category,
    evidence,
    relatedFiles,
    createdAt: new Date().toISOString()
  };
}

function countOccurrences(content: string, token: string): number {
  const matches = content.match(new RegExp(token, "g"));
  return matches ? matches.length : 0;
}

function detectUndefinedIdentifiers(snapshot: FileSnapshot): string[] {
  const lines = snapshot.content.split(/\r?\n/);
  const declared = new Set<string>();
  for (const line of lines) {
    const decl = line.match(/\b(?:const|let|var|function|class|interface|type|enum|import)\s+([A-Za-z_][A-Za-z0-9_]*)/g);
    if (decl) {
      for (const item of decl as string[]) {
        const name = item.split(/\s+/).at(-1);
        if (name) {
          declared.add(name.replace(/[^\w$]/g, ""));
        }
      }
    }
  }
  const suspicious: string[] = [];
  for (const line of lines) {
    const references = line.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) ?? [];
    for (const ref of references) {
      if (
        declared.has(ref) ||
        ["if", "for", "while", "return", "const", "let", "var", "function", "class", "import", "export", "async", "await", "true", "false", "null", "undefined", "typeof", "new"].includes(ref)
      ) {
        continue;
      }
      if (line.includes(`${ref}(`) || line.includes(`${ref} =`) || line.includes(`${ref}:`)) {
        continue;
      }
      suspicious.push(ref);
      break;
    }
    if (suspicious.length >= 3) {
      break;
    }
  }
  return [...new Set(suspicious)];
}

export function detectBadPractices(
  sessionId: string,
  projectPath: string,
  snapshot: FileSnapshot,
  config: ProjectConfig,
  index: number
): FindingRecord[] {
  const findings: FindingRecord[] = [];
  const content = snapshot.content;
  const file = snapshot.path;

  if (snapshot.lineCount > 120 && snapshot.functionCount <= 2) {
    findings.push(
      makeFinding(
        sessionId,
        projectPath,
        "Possible god function",
        "This file is very large but still centers around a small number of functions.",
        "warning",
        "bad-practice",
        [`Line count: ${snapshot.lineCount}`, `Function count: ${snapshot.functionCount}`],
        [file],
        index + findings.length
      )
    );
  }

  if (snapshot.nestedDepth >= 4) {
    findings.push(
      makeFinding(
        sessionId,
        projectPath,
        "Deep nesting detected",
        "The file contains deeply nested control flow that will be hard to maintain.",
        snapshot.nestedDepth >= 5 ? "critical" : "warning",
        "bad-practice",
        [`Nested depth: ${snapshot.nestedDepth}`],
        [file],
        index + findings.length
      )
    );
  }

  if (countOccurrences(content, "TODO") > 3 && countOccurrences(content, "FIXME") > 1) {
    findings.push(
      makeFinding(
        sessionId,
        projectPath,
        "Mixed concerns or unfinished work",
        "The file mixes unfinished work markers with implementation logic.",
        "info",
        "bad-practice",
        ["Multiple TODO/FIXME markers"],
        [file],
        index + findings.length
      )
    );
  }

  if (snapshot.hasSecrets) {
    findings.push(
      makeFinding(
        sessionId,
        projectPath,
        "Hardcoded secret or credential",
        "A secret-like value was detected in source text.",
        "critical",
        "security",
        ["Secret pattern matched"],
        [file],
        index + findings.length
      )
    );
  }

  const undefinedIdentifiers = detectUndefinedIdentifiers(snapshot);
  if (undefinedIdentifiers.length > 0) {
    findings.push(
      makeFinding(
        sessionId,
        projectPath,
        "Possible undefined variable usage",
        "The file appears to reference identifiers that were not clearly declared locally.",
        "warning",
        "bad-practice",
        undefinedIdentifiers.map((name: string) => `Possible undefined identifier: ${name}`),
        [file],
        index + findings.length
      )
    );
  }

  const bareImports = snapshot.imports.filter((item: string) => !item.startsWith(".") && !item.startsWith("/") && !isBuiltinImport(item));
  if (bareImports.length > 0) {
    findings.push(
      makeFinding(
        sessionId,
        projectPath,
        "External import review needed",
        "The file imports bare package specifiers that should be cross-checked against installed dependencies.",
        "info",
        "bad-practice",
        bareImports.map((name: string) => `Import: ${name}`),
        [file],
        index + findings.length
      )
    );
  }

  const antiPatternHits = config.antiPatterns.filter((rule: string) => content.toLowerCase().includes(rule.toLowerCase()));
  if (antiPatternHits.length > 0) {
    findings.push(
      makeFinding(
        sessionId,
        projectPath,
        "Configured anti-pattern match",
        "The file matches one or more user-configured anti-patterns.",
        "warning",
        "bad-practice",
        antiPatternHits,
        [file],
        index + findings.length
      )
    );
  }

  const hasCamelCase = snapshot.exportedFunctions.some((fn: FileSnapshot["exportedFunctions"][number]) => /^[a-z]/.test(fn.name));
  const hasPascalCase = snapshot.exportedFunctions.some((fn: FileSnapshot["exportedFunctions"][number]) => /^[A-Z]/.test(fn.name));
  if (hasCamelCase && hasPascalCase) {
    findings.push(
      makeFinding(
        sessionId,
        projectPath,
        "Inconsistent naming style",
        "The file mixes camelCase and PascalCase exported symbols.",
        "info",
        "consistency",
        snapshot.exportedFunctions.map((fn: FileSnapshot["exportedFunctions"][number]) => fn.name),
        [file],
        index + findings.length
      )
    );
  }

  return findings;
}
