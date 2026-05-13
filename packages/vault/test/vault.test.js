import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { resolveGlobalVault, resolveProjectVault, SentinelVault } from "../dist/vault.js";
import { defaultProjectConfig } from "../../core/dist/config.js";

async function createTempWorkspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), "sentinel-vault-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "sentinel-home-"));
  return { root, home };
}

test("vault paths and persistence helpers work in a temp workspace", async () => {
  const { root, home } = await createTempWorkspace();
  const vault = new SentinelVault(root, home);

  assert.equal(resolveProjectVault(root).root, path.join(root, ".sentinel"));
  assert.equal(resolveGlobalVault(home).root, path.join(home, ".sentinel", "global"));

  await vault.ensureProjectStructure();
  await vault.ensureGlobalStructure();
  await vault.initializeProjectFiles(defaultProjectConfig());

  await access(vault.paths.configPath);
  await access(vault.globalPaths.profilePath);
  await access(vault.globalPaths.antiPatternsPath);

  const configText = await readFile(vault.paths.configPath, "utf8");
  assert.match(configText, /defaultMode: passive/);

  const snapshotPath = await vault.saveProjectSnapshot("session-2026-05-11-001", [
    { path: "src/index.ts", status: "modified", summary: "initial file" }
  ]);
  const snapshotText = await readFile(snapshotPath, "utf8");
  assert.match(snapshotText, /src\/index\.ts/);

  const bootstrapPath = await vault.saveBootstrapPrompt("Bootstrap content");
  assert.equal(bootstrapPath, vault.paths.bootstrapPath);
  assert.equal(await readFile(bootstrapPath, "utf8"), "Bootstrap content");
});
