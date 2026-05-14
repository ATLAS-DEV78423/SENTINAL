import path from "node:path";
import { FileSnapshot, ExportedFunction, InterfaceShape } from "@sentinel/core";

const BUILTIN_MODULES = new Set([
  "node:fs",
  "node:fs/promises",
  "node:path",
  "node:os",
  "node:url",
  "node:crypto",
  "node:events",
  "node:child_process",
  "node:stream",
  "node:util"
]);

const SECRET_PATTERNS = [
  /api[_-]?key\s*[:=]\s*['"`][^'"`]{8,}['"`]/i,
  /secret\s*[:=]\s*['"`][^'"`]{8,}['"`]/i,
  /password\s*[:=]\s*['"`][^'"`]{8,}['"`]/i,
  /token\s*[:=]\s*['"`][^'"`]{8,}['"`]/i,
  /BEGIN [A-Z ]+ PRIVATE KEY/
];

function languageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".js":
    case ".jsx":
      return "javascript";
    case ".md":
      return "markdown";
    case ".json":
      return "json";
    case ".yml":
    case ".yaml":
      return "yaml";
    default:
      return "text";
  }
}

function lineCount(content: string): number {
  return content.trim().length === 0 ? 0 : content.split(/\r?\n/).length;
}

function countNestedDepth(content: string): number {
  const lines = content.split(/\r?\n/);
  let maxDepth = 0;
  for (const line of lines) {
    const spaces = line.match(/^\s*/)?.[0].length ?? 0;
    const depth = Math.floor(spaces / 2);
    maxDepth = Math.max(maxDepth, depth);
  }
  return maxDepth;
}

function extractImports(content: string): string[] {
  const imports = new Set<string>();
  const importRegex = /import\s+(?:type\s+)?(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const regex of [importRegex, dynamicRegex]) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content))) {
      if (match[1]) {
        imports.add(match[1]);
      }
    }
  }
  return [...imports];
}

function extractExportedFunctions(content: string): ExportedFunction[] {
  const results: ExportedFunction[] = [];
  const patterns = [
    /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g,
    /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>/g,
    /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(async\s+)?function\s*\(([^)]*)\)/g
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content))) {
      const name = match[1] ?? "anonymous";
      const isAsync = /\basync\b/.test(match[0]);
      const params = (match[3] ?? match[2] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
      results.push({
        name,
        signature: match[0].trim(),
        async: isAsync,
        parameters: params.length
      });
    }
  }

  return results;
}

function extractInterfaces(content: string): InterfaceShape[] {
  const results: InterfaceShape[] = [];
  const pattern = /(?:export\s+)?interface\s+([A-Za-z0-9_]+)\s*{([\s\S]*?)}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    const name = match[1] ?? "Anonymous";
    const body = match[2] ?? "";
    const fields = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes(":"))
      .map((line) => line.split(":")[0]?.trim() ?? "")
      .filter(Boolean);
    results.push({ name, fields });
  }
  return results;
}

function hasSecrets(content: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(content));
}

function countFunctions(content: string): number {
  return (content.match(/\bfunction\b/g)?.length ?? 0) +
    (content.match(/=>/g)?.length ?? 0);
}

export function summarizeFile(pathName: string, content: string): FileSnapshot {
  const imports = extractImports(content);
  const exportedFunctions = extractExportedFunctions(content);
  const interfaces = extractInterfaces(content);
  return {
    path: pathName,
    language: languageFromPath(pathName),
    content,
    lineCount: lineCount(content),
    exportedFunctions,
    interfaces,
    imports,
    usesAsyncAwait: /\basync\b|\bawait\b/.test(content),
    usesCallbacks: /\bcallback\b|\bcb\b/.test(content),
    hasSecrets: hasSecrets(content),
    nestedDepth: countNestedDepth(content),
    functionCount: countFunctions(content),
    summary: content.trim().split(/\r?\n/).slice(0, 3).join(" ").slice(0, 180)
  };
}

export function isBuiltinImport(specifier: string): boolean {
  return BUILTIN_MODULES.has(specifier) || specifier.startsWith("node:");
}
