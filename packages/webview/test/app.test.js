import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("btnStyle produces correct CSS properties", async () => {
  const { btnStyle } = await import("../dist/App.js");
  const style = btnStyle("#3b82f6");
  assert.equal(style.background, "#3b82f6");
  assert.equal(style.color, "#fff");
  assert.equal(style.border, "none");
  assert.equal(style.borderRadius, 6);
  assert.equal(style.padding, "8px 12px");
  assert.equal(style.cursor, "pointer");
  assert.equal(style.fontSize, 13);
  assert.equal(style.fontWeight, 600);
});

test("btnStyle returns unique objects per call", async () => {
  const { btnStyle } = await import("../dist/App.js");
  const a = btnStyle("#000");
  const b = btnStyle("#fff");
  assert.notEqual(a, b);
  assert.equal(a.background, "#000");
  assert.equal(b.background, "#fff");
});

test("App module loads without error", async () => {
  const mod = await import("../dist/App.js");
  assert.ok(mod.App);
  assert.equal(typeof mod.App, "function");
  assert.ok(mod.btnStyle);
  assert.equal(typeof mod.btnStyle, "function");
});

test("styles.css contains expected tailwind directives", async () => {
  const css = await readFile(fileURLToPath(new URL("../src/styles.css", import.meta.url)), "utf8");
  assert.match(css, /@tailwind base/);
  assert.match(css, /@tailwind components/);
  assert.match(css, /@tailwind utilities/);
  assert.match(css, /#root/);
});
