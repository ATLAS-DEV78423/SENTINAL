import { readFile } from "node:fs/promises";
import { SessionManager } from "@sentinel/guardian";
import { stringifyProjectConfig } from "@sentinel/core";
import { fileURLToPath } from "node:url";
import { renderCliHelp, renderAboutBanner, writeBrandBanner } from "./branding.js";

export interface CliStream {
  write(chunk: string): unknown;
  isTTY?: boolean;
}

export interface CliRunOptions {
  argv: string[];
  cwd?: string;
  stdout: CliStream;
  stderr: CliStream;
}

function cwdProjectRoot(options: CliRunOptions): string {
  return options.cwd ?? process.cwd();
}

function parseArgs(argv: string[]): { command: string; args: string[] } {
  const [, , command = "status", ...args] = argv;
  return { command, args };
}

export async function runCli(options: CliRunOptions): Promise<number> {
  const { command, args } = parseArgs(options.argv);
  const projectRoot = cwdProjectRoot(options);
  let manager: SessionManager | null = null;
  const ensureManager = async (): Promise<SessionManager> => {
    if (!manager) {
      manager = await SessionManager.open({ projectRoot });
    }
    return manager;
  };

  switch (command) {
    case "init": {
      await writeBrandBanner(options.stderr as NodeJS.WriteStream);
      const sessionManager = await ensureManager();
      const templateName = args[0];
      await sessionManager.initProject(templateName);
      options.stdout.write(`Initialized Sentinel in ${projectRoot}\n`);
      break;
    }
    case "start": {
      await writeBrandBanner(options.stderr as NodeJS.WriteStream);
      const sessionManager = await ensureManager();
      const session = await sessionManager.startSession({ trigger: "manual" });
      const bootstrap = await sessionManager.copyBootstrapToClipboardText();
      options.stdout.write(`${session.id}\n\n${bootstrap}\n`);
      break;
    }
    case "end": {
      const sessionManager = await ensureManager();
      await sessionManager.endSession();
      options.stdout.write("Session ended.\n");
      break;
    }
    case "copy-bootstrap": {
      const sessionManager = await ensureManager();
      const prompt = await sessionManager.copyBootstrapToClipboardText();
      options.stdout.write(prompt);
      break;
    }
    case "status": {
      await writeBrandBanner(options.stderr as NodeJS.WriteStream);
      const sessionManager = await ensureManager();
      const status = sessionManager.getStatus();
      options.stdout.write(JSON.stringify(status, null, 2) + "\n");
      break;
    }
    case "report": {
      const sessionManager = await ensureManager();
      const latest = await sessionManager.vault.loadLatestReport();
      if (!latest) {
        options.stdout.write("No report found.\n");
        break;
      }
      options.stdout.write(await readFile(latest, "utf8"));
      break;
    }
    case "sync-vault": {
      const target = args[0];
      if (!target) {
        throw new Error("sync-vault requires a target directory");
      }
      const sessionManager = await ensureManager();
      await sessionManager.syncGlobalVault(target);
      options.stdout.write(`Synced global vault to ${target}\n`);
      break;
    }
    case "export-config": {
      const sessionManager = await ensureManager();
      const config = await sessionManager.vault.loadProjectConfig();
      if (!config) {
        options.stdout.write("No config found.\n");
        break;
      }
      options.stdout.write(stringifyProjectConfig(config));
      break;
    }
    case "scan": {
      await writeBrandBanner(options.stderr as NodeJS.WriteStream);
      const sessionManager = await ensureManager();
      const session = await sessionManager.startSession({ trigger: "manual" });
      await sessionManager.endSession("On-demand scan completed.");
      options.stdout.write(`Scan completed for ${session.id}\n`);
      break;
    }
    case "reset-session": {
      const sessionManager = await ensureManager();
      await sessionManager.resetSession();
      options.stdout.write("Session state reset.\n");
      break;
    }
    case "about":
    case "--help":
    case "-h":
    case "help": {
      if (command === "about") {
        options.stdout.write(await renderAboutBanner(options.stdout as NodeJS.WriteStream));
        break;
      }
      await writeBrandBanner(options.stderr as NodeJS.WriteStream);
      options.stdout.write(renderCliHelp());
      break;
    }
    default:
      options.stdout.write(`Unknown command: ${command}\n`);
      return 1;
  }

  return 0;
}

async function main(): Promise<void> {
  const exitCode = await runCli({
    argv: process.argv,
    cwd: process.cwd(),
    stdout: process.stdout,
    stderr: process.stderr
  });
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

const isDirectExecution = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;

if (isDirectExecution) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
