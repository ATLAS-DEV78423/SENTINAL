import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { SessionManager } from "../dist/session-manager.js";

async function createWorkspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), "sentinel-session-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "sentinel-home-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "index.ts"), "export const answer = 42;\n", "utf8");
  await writeFile(path.join(root, "README.md"), "# Demo\n", "utf8");
  return { root, home };
}

test("session manager can initialize, start, bootstrap, and end a session", async () => {
  const { root, home } = await createWorkspace();
  const now = () => new Date("2026-05-11T00:00:00.000Z");
  const manager = await SessionManager.open({
    projectRoot: root,
    homeDir: home,
    allowGitBootstrap: false,
    allowFileWatcherFallback: false,
    now
  });

  await manager.initProject("Blank", {
    productDescription: "Demo workspace",
    stack: ["TypeScript"],
    requirements: ["Keep outputs deterministic"],
    designRules: ["Use the shared brand system"]
  });

  await access(path.join(root, ".sentinel", "config.yml"));
  const session = await manager.startSession({ trigger: "manual" });
  assert.equal(session.status, "active");
  assert.equal(session.projectPath, root);

  const bootstrap = await manager.copyBootstrapToClipboardText();
  assert.match(bootstrap, /Project summary: Demo workspace/);
  assert.match(bootstrap, /src/);

  const outside = await mkdtemp(path.join(os.tmpdir(), "sentinel-outside-"));
  await writeFile(path.join(outside, "alien.ts"), "export const alien = true;\n", "utf8");
  const outsideResult = await manager.captureFileSave(path.join(outside, "alien.ts"));
  assert.equal(outsideResult, null);
  assert.equal(manager.getStatus().files, 2);

  const activeState = manager.getStatus();
  assert.equal(activeState.session?.status, "active");
  assert.equal(activeState.files, 2);
  assert.equal(activeState.gitAvailable, false);

  const ended = await manager.endSession("Done");
  assert.equal(ended?.status, "ended");
  assert.equal(manager.getStatus().reportCount, 1);

  const reportPath = await manager.vault.loadLatestReport();
  assert.ok(reportPath);
  const reportText = await readFile(reportPath, "utf8");
  assert.match(reportText, /# Session Report/);
  assert.match(reportText, /## Summary/);

  await manager.resetSession();
  assert.equal(manager.getStatus().session, null);
});
