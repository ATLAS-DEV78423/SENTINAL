import { ContradictionRecord, FileSnapshot, Severity } from "@sentinel/core";

interface SignatureIndexEntry {
  file: string;
  signature: string;
  async: boolean;
  parameters: number;
}

function severityForMismatch(parametersA: number, parametersB: number, asyncA: boolean, asyncB: boolean): Severity {
  if (asyncA !== asyncB) {
    return "warning";
  }
  if (parametersA !== parametersB) {
    return "warning";
  }
  return "info";
}

export function detectContradictions(
  sessionId: string,
  projectPath: string,
  files: FileSnapshot[],
  previous: ContradictionRecord[] = []
): ContradictionRecord[] {
  const contradictions: ContradictionRecord[] = [];
  const seenFunctions = new Map<string, SignatureIndexEntry[]>();
  const seenInterfaces = new Map<string, { file: string; shape: string[] }[]>();

  for (const file of files) {
    for (const fn of file.exportedFunctions) {
      const list = seenFunctions.get(fn.name) ?? [];
      list.push({
        file: file.path,
        signature: fn.signature,
        async: fn.async,
        parameters: fn.parameters
      });
      seenFunctions.set(fn.name, list);
    }

    for (const iface of file.interfaces) {
      const list = seenInterfaces.get(iface.name) ?? [];
      list.push({ file: file.path, shape: iface.fields });
      seenInterfaces.set(iface.name, list);
    }
  }

  let index = 0;
  for (const [name, entries] of seenFunctions.entries()) {
    if (entries.length < 2) {
      continue;
    }
    const first = entries[0];
    if (!first) {
      continue;
    }
    for (const entry of entries.slice(1)) {
      if (entry.parameters !== first.parameters || entry.async !== first.async) {
        contradictions.push({
          id: `fn-${name}-${index}`,
          sessionId,
          projectPath,
          title: `Function shape mismatch for ${name}`,
          description: `The exported function ${name} is defined differently across files.`,
          severity: severityForMismatch(first.parameters, entry.parameters, first.async, entry.async),
          status: "open",
          evidence: [first.file, entry.file, first.signature, entry.signature],
          relatedFiles: [first.file, entry.file],
          detectedAt: new Date().toISOString(),
          source: "file"
        });
        index += 1;
        break;
      }
    }
  }

  for (const [name, entries] of seenInterfaces.entries()) {
    if (entries.length < 2) {
      continue;
    }
    const first = entries[0];
    if (!first) {
      continue;
    }
    for (const entry of entries.slice(1)) {
      const differentShape =
        first.shape.length !== entry.shape.length ||
        first.shape.some((field, position) => field !== entry.shape[position]);
      if (differentShape) {
        contradictions.push({
          id: `shape-${name}-${index}`,
          sessionId,
          projectPath,
          title: `Data shape drift for ${name}`,
          description: `The interface or type ${name} has incompatible shapes across files.`,
          severity: "warning",
          status: "open",
          evidence: [first.file, entry.file, first.shape.join(", "), entry.shape.join(", ")],
          relatedFiles: [first.file, entry.file],
          detectedAt: new Date().toISOString(),
          source: "file"
        });
        index += 1;
        break;
      }
    }
  }

  for (const file of files) {
    const usesAsync = file.usesAsyncAwait;
    const usesCallbacks = file.usesCallbacks;
    if (usesAsync && usesCallbacks) {
      contradictions.push({
        id: `async-callback-${index}`,
        sessionId,
        projectPath,
        title: `Async and callback styles mixed in ${file.path}`,
        description: "The same file uses both async/await and callback patterns in a way that may indicate an inconsistent operation model.",
        severity: "info",
        status: "open",
        evidence: [file.path],
        relatedFiles: [file.path],
        detectedAt: new Date().toISOString(),
        source: "file"
      });
      index += 1;
    }
  }

  const previousKeys = new Set(previous.map((item) => `${item.title}:${item.relatedFiles.join(",")}`));
  return contradictions.filter((item) => !previousKeys.has(`${item.title}:${item.relatedFiles.join(",")}`));
}

