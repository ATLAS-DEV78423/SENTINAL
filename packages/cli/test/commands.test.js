import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { runCli } from "../dist/index.js";

async function createWorkspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), "sentinel-cli-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "sentinel-home-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "index.ts"), "export const answer = 42;\n", "utf8");
  return { root, home };
}

function createStream(isTTY) {
  let buffer = "";
  return {
    isTTY,
    write(chunk) {
      buffer += String(chunk);
      return true;
    },
    text() {
      return buffer;
    }
  };
}

test("CLI commands keep machine output stable across the main flows", async () => {
  const { root, home } = await createWorkspace();
  const previousHome = process.env.SENTINEL_HOME;
  process.env.SENTINEL_HOME = home;

  try {
    const initStdout = createStream(false);
    const initStderr = createStream(false);
    await runCli({ argv: ["node", "sentinel", "init"], cwd: root, stdout: initStdout, stderr: initStderr });
    assert.match(initStdout.text(), /Initialized Sentinel in/);
    assert.match(await readFile(path.join(root, ".sentinel", "config.yml"), "utf8"), /defaultMode: passive/);

    const startStdout = createStream(true);
    const startStderr = createStream(true);
    await runCli({ argv: ["node", "sentinel", "start"], cwd: root, stdout: startStdout, stderr: startStderr });
    assert.match(startStdout.text(), /session-\d{4}-\d{2}-\d{2}-\d{3}/);
    assert.match(startStdout.text(), /# Sentinel Bootstrap Prompt/);

    const statusStdout = createStream(false);
    const statusStderr = createStream(false);
    await runCli({ argv: ["node", "sentinel", "status"], cwd: root, stdout: statusStdout, stderr: statusStderr });
    const parsedStatus = JSON.parse(statusStdout.text());
    assert.equal(parsedStatus.session.status, "active");
    assert.equal(parsedStatus.gitAvailable, false);

    const copyBootstrapStdout = createStream(false);
    const copyBootstrapStderr = createStream(false);
    await runCli({ argv: ["node", "sentinel", "copy-bootstrap"], cwd: root, stdout: copyBootstrapStdout, stderr: copyBootstrapStderr });
    assert.match(copyBootstrapStdout.text(), /# Sentinel Bootstrap Prompt/);

    const exportConfigStdout = createStream(false);
    const exportConfigStderr = createStream(false);
    await runCli({ argv: ["node", "sentinel", "export-config"], cwd: root, stdout: exportConfigStdout, stderr: exportConfigStderr });
    assert.match(exportConfigStdout.text(), /defaultMode:\s+passive/);

    const endStdout = createStream(false);
    const endStderr = createStream(false);
    await runCli({ argv: ["node", "sentinel", "end"], cwd: root, stdout: endStdout, stderr: endStderr });
    assert.match(endStdout.text(), /Session ended\./);

    const reportStdout = createStream(false);
    const reportStderr = createStream(false);
    await runCli({ argv: ["node", "sentinel", "report"], cwd: root, stdout: reportStdout, stderr: reportStderr });
    assert.match(reportStdout.text(), /# Session Report/);

    const resetStdout = createStream(false);
    const resetStderr = createStream(false);
    await runCli({ argv: ["node", "sentinel", "reset-session"], cwd: root, stdout: resetStdout, stderr: resetStderr });
    assert.match(resetStdout.text(), /Session state reset\./);

    const scanStdout = createStream(true);
    const scanStderr = createStream(true);
    await runCli({ argv: ["node", "sentinel", "scan"], cwd: root, stdout: scanStdout, stderr: scanStderr });
    assert.match(scanStdout.text(), /Scan completed for session-/);
  } finally {
    if (previousHome === undefined) {
      delete process.env.SENTINEL_HOME;
    } else {
      process.env.SENTINEL_HOME = previousHome;
    }
  }
});
