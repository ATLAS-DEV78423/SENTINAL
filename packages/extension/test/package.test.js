import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("extension packaging metadata stays VSCE friendly", async () => {
  const packageJson = JSON.parse(await readFile(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
  const vscodeIgnore = await readFile(fileURLToPath(new URL("../.vscodeignore", import.meta.url)), "utf8");

  assert.equal(packageJson.name, "sentinel-vscode");
  assert.equal(packageJson.version, "1.0.0");
  assert.equal(packageJson.displayName, "Sentinel");
  assert.deepEqual(packageJson.files, ["dist", "media", "LICENSE"]);
  assert.equal(packageJson.publisher, "simplemanslab");
  assert.equal(packageJson.license, "MIT");
  assert.equal(packageJson.icon, "media/icon.png");
  assert.deepEqual(packageJson.categories, ["Other"]);
  assert.match(packageJson.galleryBanner.color, /^#/);
  assert.ok(packageJson.repository);
  assert.match(vscodeIgnore, /^\.\.\/\*\*$/m);
  assert.match(vscodeIgnore, /^\.\.\/\.\.\/\*\*$/m);
  assert.ok(!vscodeIgnore.includes("LICENSE"));
});
