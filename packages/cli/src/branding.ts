import { readFile } from "node:fs/promises";

const BRAND_TITLE = "Sentinel CLI";
const ABOUT_TITLE = "SENTINAL";
const BANNER_SUBTITLE = "Local-first memory and consistency for AI coding tools.";

function supportsColor(stream?: NodeJS.WriteStream): boolean {
  return Boolean(stream?.isTTY) && !process.env.NO_COLOR;
}

function color(text: string, code: string, stream?: NodeJS.WriteStream): string {
  return supportsColor(stream) ? `\u001b[${code}m${text}\u001b[0m` : text;
}

async function readAsset(name: string): Promise<string> {
  const url = new URL(`../assets/${name}`, import.meta.url);
  return readFile(url, "utf8");
}

export async function getCliAvatarArt(stream?: NodeJS.WriteStream): Promise<string> {
  try {
    return await readAsset(supportsColor(stream) ? "avatar-ansi.txt" : "avatar-ascii.txt");
  } catch {
    return [
      "   ____   ",
      "  / __ \\  ",
      " | |  | | ",
      " | |__| | ",
      "  \\____/  "
    ].join("\n");
  }
}

export async function getCliWordmarkArt(stream?: NodeJS.WriteStream): Promise<string> {
  try {
    return await readAsset(supportsColor(stream) ? "sentinal-wordmark-ansi.txt" : "sentinal-wordmark-ascii.txt");
  } catch {
    return "SENTINAL";
  }
}

export async function renderCliBanner(stream: NodeJS.WriteStream = process.stderr): Promise<string> {
  const avatar = await getCliAvatarArt(stream);
  const title = color(BRAND_TITLE, "1;32", stream);
  const subtitle = color(BANNER_SUBTITLE, "0;90", stream);
  return `${avatar}\n${title}\n${subtitle}\n`;
}

export async function renderAboutBanner(stream: NodeJS.WriteStream = process.stderr): Promise<string> {
  const wordmark = await getCliWordmarkArt(stream);
  const avatar = await getCliAvatarArt(stream);
  const title = color(ABOUT_TITLE, "1;32", stream);
  const subtitle = color(BANNER_SUBTITLE, "0;90", stream);
  return `${wordmark}\n\n${avatar}\n${title}\n${subtitle}\n`;
}

export function renderCliHelp(): string {
  return [
    "Usage: sentinel <command>",
    "",
    "Commands:",
    "  init [template]       Initialize Sentinel in the current project",
    "  start                 Start a Sentinel session",
    "  end                   End the current session",
    "  copy-bootstrap        Print the bootstrap prompt to stdout",
    "  status                Show session status as JSON",
    "  report                Print the latest session report",
    "  sync-vault <dir>      Sync the global vault to a folder",
    "  export-config         Print the project config as YAML",
    "  scan                  Run an on-demand session scan",
    "  reset-session         Clear in-memory session state",
    "  about                 Show the SENTINAL wordmark, avatar, and brand info",
    ""
  ].join("\n");
}

export async function writeBrandBanner(stream: NodeJS.WriteStream): Promise<void> {
  if (!stream.isTTY) {
    return;
  }
  stream.write(`${await renderCliBanner(stream)}\n`);
}

export async function writeAboutBanner(stream: NodeJS.WriteStream): Promise<void> {
  if (!stream.isTTY) {
    return;
  }
  stream.write(`${await renderAboutBanner(stream)}\n`);
}
