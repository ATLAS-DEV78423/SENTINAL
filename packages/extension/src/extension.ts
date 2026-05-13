import * as vscode from "vscode";
import path from "node:path";
import os from "node:os";
import { access } from "node:fs/promises";
import { SENTINEL_EVENTS } from "@sentinel/core";
import { ProjectConfig, STACK_TEMPLATES } from "@sentinel/core";
import { SessionManager } from "@sentinel/guardian";
import { LlmRouter, type LlmProviderName } from "@sentinel/llm";
import { formatStatusBarText } from "./status.js";
import { buildSidebarHtml } from "./webview.js";
import { ProviderPreferencesStore } from "./provider-preferences.js";
import { defaultProviderPreferences, type ProviderPreferences, type ProviderSecretStatus } from "./provider-state.js";
import { SentinelSecretStore } from "./secrets.js";

function isPathWithinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative.length === 0 || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

interface ExtensionState {
  session: ReturnType<SessionManager["getStatus"]>["session"];
  score: ReturnType<SessionManager["getStatus"]>["score"];
  files: number;
  gitAvailable: boolean;
  notice: string;
  bootstrapPrompt: string;
  openContradictions: ReturnType<SessionManager["getStatus"]>["openContradictions"];
  findings: ReturnType<SessionManager["getStatus"]>["findings"];
  decisions: ReturnType<SessionManager["getStatus"]>["decisions"];
  reportCount: number;
  providerSettings: ProviderPreferences;
  secretStatus: Record<LlmProviderName, ProviderSecretStatus>;
  connectionNotice: string;
}

class SentinelSidebarProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri, private readonly controller: SentinelController) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = buildSidebarHtml(webviewView.webview, this.extensionUri);
    this.controller.attachWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message?.type !== "sentinel/command") {
        return;
      }
      switch (message.command) {
        case "start":
          await this.controller.startSession();
          break;
        case "end":
          await this.controller.endSession();
          break;
        case "copy":
          await this.controller.copyBootstrap();
          break;
        case "save-bootstrap":
          await this.controller.saveBootstrap(message.content ?? "");
          break;
        case "regenerate-bootstrap":
          await this.controller.regenerateBootstrap();
          break;
        case "logDecision":
          await this.controller.logDecision();
          break;
        case "addOverride":
          await this.controller.addOverride();
          break;
        case "resolveContradiction":
          await this.controller.resolveContradiction();
          break;
        case "save-provider-preferences":
          await this.controller.saveProviderPreferences(message.preferences ?? {});
          break;
        case "save-provider-secret":
          await this.controller.saveProviderSecret(message.provider, message.value ?? "");
          break;
        case "clear-provider-secret":
          await this.controller.clearProviderSecret(message.provider);
          break;
        case "test-provider-connection":
          await this.controller.testProviderConnection(message.provider);
          break;
      }
    });
  }
}

class SentinelController {
  private manager: SessionManager | null = null;
  private webview: vscode.Webview | null = null;
  private statusBar: vscode.StatusBarItem;
  private watchersInstalled = false;
  private readonly secretStore: SentinelSecretStore;
  private readonly providerPreferences: ProviderPreferencesStore;
  private providerSettings: ProviderPreferences = defaultProviderPreferences();
  private secretStatus: Record<LlmProviderName, ProviderSecretStatus> = {
    gemini: { configured: false, masked: "Not set" },
    grok: { configured: false, masked: "Not set" },
    openrouter: { configured: false, masked: "Not set" },
    "nvidia-nim": { configured: false, masked: "Not set" },
    groq: { configured: false, masked: "Not set" },
    openai: { configured: false, masked: "Not set" },
    anthropic: { configured: false, masked: "Not set" },
    minimax: { configured: false, masked: "Not set" },
    cohere: { configured: false, masked: "Not set" },
    mistral: { configured: false, masked: "Not set" },
    "together-ai": { configured: false, masked: "Not set" },
    perplexity: { configured: false, masked: "Not set" },
    deepseek: { configured: false, masked: "Not set" },
    "azure-openai": { configured: false, masked: "Not set" }
  };
  private connectionNotice = "Provider secrets are stored in VS Code SecretStorage.";

  constructor(private readonly context: vscode.ExtensionContext) {
    this.secretStore = new SentinelSecretStore(context.secrets);
    this.providerPreferences = new ProviderPreferencesStore(context.workspaceState);
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBar.text = formatStatusBarText(0);
    this.statusBar.tooltip = "Sentinel status";
    this.statusBar.command = "sentinel.openSidebar";
    this.statusBar.show();
    context.subscriptions.push(this.statusBar);
  }

  async initialize(): Promise<void> {
    this.providerSettings = await this.providerPreferences.load();
    this.secretStatus = await this.secretStore.loadSecretStatus();
    const root = this.workspaceRoot();
    if (!root) {
      this.refreshStatus();
      return;
    }
    this.manager = await SessionManager.open({ projectRoot: root });
    this.manager.on(SENTINEL_EVENTS.WORKSPACE_UPDATED, () => this.refreshStatus());
    this.manager.on(SENTINEL_EVENTS.SESSION_STARTED, () => this.refreshStatus());
    this.manager.on(SENTINEL_EVENTS.SESSION_ENDED, () => this.refreshStatus());
    this.manager.on(SENTINEL_EVENTS.BOOTSTRAP_UPDATED, () => this.refreshStatus());
    this.manager.on(SENTINEL_EVENTS.REPORT_GENERATED, () => this.refreshStatus());
    this.manager.on(SENTINEL_EVENTS.VAULT_UPDATED, () => this.refreshStatus());
    this.manager.on(SENTINEL_EVENTS.CONTRADICTION_DETECTED, () => this.refreshStatus());
    this.manager.on(SENTINEL_EVENTS.CONTRADICTION_RESOLVED, () => this.refreshStatus());
    try {
      await access(path.join(root, ".sentinel", "config.yml"));
      await this.manager.startSession({ trigger: "auto" });
    } catch {
      // No project config yet; the user can initialize from the command palette or sidebar.
    }
    this.refreshStatus();
    if (!this.watchersInstalled) {
      this.installWatchers();
    }
  }

  workspaceRoot(): string | null {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
  }

  async ensureManager(): Promise<SessionManager> {
    if (this.manager) {
      return this.manager;
    }
    const root = this.workspaceRoot();
    if (!root) {
      throw new Error("No workspace folder is open.");
    }
    this.manager = await SessionManager.open({ projectRoot: root });
    return this.manager;
  }

  attachWebview(webview: vscode.Webview): void {
    this.webview = webview;
    void this.pushState();
  }

  refreshStatus(): void {
    const state = this.manager?.getStatus();
    const score = state?.score?.total ?? 0;
    this.statusBar.text = formatStatusBarText(score);
    void this.pushState();
  }

  private async collectState(): Promise<ExtensionState> {
    const status = this.manager?.getStatus() ?? {
      session: null,
      score: null,
      files: 0,
      gitAvailable: false,
      notice: "Open a project to begin.",
      bootstrapPrompt: "",
      openContradictions: [],
      findings: [],
      decisions: [],
      reportCount: 0
    };
    return {
      ...status,
      providerSettings: this.providerSettings,
      secretStatus: this.secretStatus,
      connectionNotice: this.connectionNotice
    };
  }

  private async syncSettingsState(): Promise<void> {
    this.providerSettings = await this.providerPreferences.load();
    this.secretStatus = await this.secretStore.loadSecretStatus();
  }

  async startSession(): Promise<void> {
    const manager = await this.ensureManager();
    await manager.startSession({ trigger: "manual" });
    this.refreshStatus();
  }

  async endSession(): Promise<void> {
    const manager = await this.ensureManager();
    await manager.endSession();
    this.refreshStatus();
  }

  async copyBootstrap(): Promise<void> {
    const manager = await this.ensureManager();
    const prompt = await manager.copyBootstrapToClipboardText();
    await vscode.env.clipboard.writeText(prompt);
    vscode.window.showInformationMessage("Sentinel bootstrap prompt copied.");
  }

  async saveBootstrap(content: string): Promise<void> {
    const manager = await this.ensureManager();
    await manager.updateBootstrapPrompt(content);
    vscode.window.showInformationMessage("Sentinel bootstrap prompt saved.");
    this.refreshStatus();
  }

  async regenerateBootstrap(): Promise<void> {
    const manager = await this.ensureManager();
    const prompt = await manager.regenerateBootstrapPrompt();
    if (this.webview) {
      this.webview.postMessage({ type: "sentinel/bootstrap", content: prompt });
    }
    vscode.window.showInformationMessage("Sentinel bootstrap prompt regenerated.");
    this.refreshStatus();
  }

  async initProject(): Promise<void> {
    const manager = await this.ensureManager();
    const selected = await vscode.window.showQuickPick(STACK_TEMPLATES.map((template) => template.name), { placeHolder: "Choose a Sentinel starter template" });
    const description = await vscode.window.showInputBox({ prompt: "What are you building?" });
    const stack = await vscode.window.showInputBox({ prompt: "What tools and tech are you using? Use commas to separate them." });
    const requirements = await vscode.window.showInputBox({ prompt: "What must this app always do?" });
    const antiPatterns = await vscode.window.showInputBox({ prompt: "What should the AI never do in this project?" });
    const carryOver = await vscode.window.showInputBox({ prompt: "Any rules from past projects you want to carry in?" });
    const parsedStack = stack?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
    const chosenTemplate = STACK_TEMPLATES.find((template) => template.name === selected);
    const config: Partial<ProjectConfig> = {
      productDescription: description ?? "",
      stack: parsedStack.length > 0 ? parsedStack : chosenTemplate?.name && chosenTemplate.name !== "Blank" ? [chosenTemplate.name] : [],
      preferredLibraries: chosenTemplate?.preferredLibraries ?? [],
      requirements: requirements ? [requirements] : [],
      antiPatterns: antiPatterns ? [antiPatterns] : [],
      carryOverRules: carryOver ? [carryOver] : [],
      designRules: chosenTemplate?.designRules ?? []
    };
    await manager.initProject(selected ?? "Blank", config);
    vscode.window.showInformationMessage("Sentinel project initialized.");
    this.refreshStatus();
  }

  async exportReport(): Promise<void> {
    const manager = await this.ensureManager();
    const latest = await manager.vault.loadLatestReport();
    if (!latest) {
      vscode.window.showWarningMessage("No Sentinel report available yet.");
      return;
    }
    const document = await vscode.workspace.openTextDocument(latest);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  async syncVault(): Promise<void> {
    const manager = await this.ensureManager();
    const target = await vscode.window.showInputBox({ prompt: "Enter a folder to sync the global vault to" });
    if (!target) {
      return;
    }
    await manager.syncGlobalVault(target);
    vscode.window.showInformationMessage(`Global vault synced to ${target}`);
  }

  async saveProviderPreferences(input: Partial<ProviderPreferences>): Promise<void> {
    this.providerSettings = await this.providerPreferences.save(input);
    this.connectionNotice = `Default provider set to ${this.providerSettings.defaultProvider}.`;
    void this.pushState();
  }

  async saveProviderSecret(provider: LlmProviderName, value: string): Promise<void> {
    await this.secretStore.save(provider, value);
    this.secretStatus = await this.secretStore.loadSecretStatus();
    this.connectionNotice = `${provider} secret saved in SecretStorage.`;
    void this.pushState();
  }

  async clearProviderSecret(provider: LlmProviderName): Promise<void> {
    await this.secretStore.clear(provider);
    this.secretStatus = await this.secretStore.loadSecretStatus();
    this.connectionNotice = `${provider} secret removed from SecretStorage.`;
    void this.pushState();
  }

  async testProviderConnection(provider?: LlmProviderName): Promise<void> {
    const selectedProvider = provider ?? this.providerSettings.defaultProvider;
    const secrets = await this.secretStore.loadSecrets();
    const model = this.getModelForScope("promptCompression");
    if (!model || model.trim().length === 0) {
      this.connectionNotice = "Set a model before testing a provider connection.";
      vscode.window.showWarningMessage(this.connectionNotice);
      void this.pushState();
      return;
    }
    const router = new LlmRouter({ secrets });
    try {
      await router.generate({
        provider: selectedProvider,
        model,
        prompt: "Sentinel connection check.",
        temperature: 0
      });
      this.connectionNotice = `${selectedProvider} connection test succeeded.`;
      vscode.window.showInformationMessage(this.connectionNotice);
    } catch (error) {
      this.connectionNotice = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(this.connectionNotice);
    }
    void this.pushState();
  }

  private getModelForScope(scope: keyof ProviderPreferences["modelAssignments"]): string {
    return this.providerSettings.modelAssignments[scope];
  }

  async logDecision(): Promise<void> {
    const manager = await this.ensureManager();
    const title = await vscode.window.showInputBox({ prompt: "Decision title" });
    if (!title) {
      return;
    }
    const summary = await vscode.window.showInputBox({ prompt: "Short summary" });
    if (!summary) {
      return;
    }
    const reason = await vscode.window.showInputBox({ prompt: "Why was this decision made?" });
    if (!reason) {
      return;
    }
    const relatedFiles = await vscode.window.showInputBox({ prompt: "Related files (comma-separated, optional)" });
    await manager.logDecision({
      title,
      summary,
      reason,
      relatedFiles: relatedFiles ? relatedFiles.split(",").map((item) => item.trim()).filter(Boolean) : [],
      source: "user"
    });
    vscode.window.showInformationMessage("Sentinel decision logged.");
    this.refreshStatus();
  }

  async addOverride(): Promise<void> {
    const manager = await this.ensureManager();
    const rule = await vscode.window.showInputBox({ prompt: "Which rule should be overridden?" });
    if (!rule) {
      return;
    }
    const reason = await vscode.window.showInputBox({ prompt: "Why is this override intentional in this project?" });
    if (!reason) {
      return;
    }
    await manager.addOverride(rule, reason);
    vscode.window.showInformationMessage("Sentinel override added.");
    this.refreshStatus();
  }

  async resolveContradiction(): Promise<void> {
    const manager = await this.ensureManager();
    const state = manager.getStatus();
    const open = state.openContradictions;
    if (open.length === 0) {
      vscode.window.showInformationMessage("No open contradictions to resolve.");
      return;
    }
    const selected = await vscode.window.showQuickPick(
      open.map((item) => ({
        id: item.id,
        label: item.title,
        description: item.severity,
        detail: item.relatedFiles.length > 0 ? item.relatedFiles.join(", ") : item.description
      })),
      { placeHolder: "Select a contradiction to mark as resolved" }
    );
    if (!selected) {
      return;
    }
    const note = await vscode.window.showInputBox({ prompt: "Resolution note" });
    await manager.markContradictionResolved(selected.id, note ?? "Resolved by user.");
    vscode.window.showInformationMessage("Sentinel contradiction marked as resolved.");
    this.refreshStatus();
  }

  async openSidebar(): Promise<void> {
    await vscode.commands.executeCommand("workbench.view.extension.sentinel");
  }

  private installWatchers(): void {
    this.watchersInstalled = true;
    const saveWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (!this.manager) {
        return;
      }
      const root = this.workspaceRoot();
      if (!root || !isPathWithinRoot(root, document.uri.fsPath)) {
        return;
      }
      await this.manager.captureFileSave(document.uri.fsPath);
      this.refreshStatus();
    });
    this.context.subscriptions.push(saveWatcher);
  }

  async pushState(): Promise<void> {
    if (!this.webview) {
      return;
    }
    const state = await this.collectState();
    this.webview.postMessage({
      type: "sentinel/state",
      state
    });
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const controller = new SentinelController(context);
  await controller.initialize();

  const sidebarProvider = new SentinelSidebarProvider(context.extensionUri, controller);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("sentinel.sidebar", sidebarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sentinel.startSession", () => controller.startSession()),
    vscode.commands.registerCommand("sentinel.endSession", () => controller.endSession()),
    vscode.commands.registerCommand("sentinel.copyBootstrap", () => controller.copyBootstrap()),
    vscode.commands.registerCommand("sentinel.initProject", () => controller.initProject()),
    vscode.commands.registerCommand("sentinel.exportReport", () => controller.exportReport()),
    vscode.commands.registerCommand("sentinel.syncVault", () => controller.syncVault()),
    vscode.commands.registerCommand("sentinel.logDecision", () => controller.logDecision()),
    vscode.commands.registerCommand("sentinel.addOverride", () => controller.addOverride()),
    vscode.commands.registerCommand("sentinel.resolveContradiction", () => controller.resolveContradiction()),
    vscode.commands.registerCommand("sentinel.openSidebar", () => controller.openSidebar())
  );
}

export function deactivate(): void {}
