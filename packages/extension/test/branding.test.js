import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildSidebarTemplate } from "../dist/sidebar-template.js";
import { formatStatusBarText } from "../dist/status.js";

test("extension chrome uses the shared Sentinel brand language", async () => {
  assert.equal(formatStatusBarText(87), "$(shield) Sentinel 87/100");

  const html = buildSidebarTemplate({ iconUri: "vscode-resource://sentinel/icon.svg", nonce: "abc123" });
  assert.match(html, /SENTINAL/);
  assert.match(html, /Shared brand chrome/);
  assert.match(html, /vscode-resource:\/\/sentinel\/icon\.svg/);
  assert.match(html, /#22c55e/);
  assert.match(html, /#d4af37/);
  assert.match(html, /Default provider/);
  assert.match(html, /Provider API keys/);
  assert.match(html, /test-provider-connection/);

  const icon = await readFile(fileURLToPath(new URL("../media/icon.svg", import.meta.url)), "utf8");
  assert.match(icon, /Sentinel extension icon/);
  assert.match(icon, /#22C55E/);
  assert.match(icon, /#D4AF37/);
});
