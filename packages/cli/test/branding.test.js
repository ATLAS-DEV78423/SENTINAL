import assert from "node:assert/strict";
import test from "node:test";
import { getCliAvatarArt, getCliWordmarkArt, renderAboutBanner, renderCliBanner, renderCliHelp, writeAboutBanner, writeBrandBanner } from "../dist/branding.js";

function createStream(isTTY) {
  const writes = [];
  return {
    isTTY,
    writes,
    write(chunk) {
      writes.push(String(chunk));
    }
  };
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

test("CLI banners keep the avatar and SENTINAL wordmark split", async () => {
  const ttyStream = createStream(true);
  const banner = await renderCliBanner(ttyStream);
  const about = await renderAboutBanner(ttyStream);
  const avatar = await getCliAvatarArt(ttyStream);
  const wordmark = await getCliWordmarkArt(ttyStream);

  assert.ok(stripAnsi(banner).includes("Sentinel CLI"));
  assert.ok(stripAnsi(about).includes("SENTINAL"));
  assert.ok(avatar.length > 0);
  assert.ok(wordmark.length > 0);
  assert.ok(renderCliHelp().includes("Show the SENTINAL wordmark"));
});

test("TTY-only banner writers stay silent for non-interactive streams", async () => {
  const ttyStream = createStream(true);
  const nonTtyStream = createStream(false);

  await writeBrandBanner(nonTtyStream);
  await writeAboutBanner(nonTtyStream);
  assert.equal(nonTtyStream.writes.length, 0);

  await writeBrandBanner(ttyStream);
  await writeAboutBanner(ttyStream);
  assert.ok(ttyStream.writes.join("").length > 0);
});
