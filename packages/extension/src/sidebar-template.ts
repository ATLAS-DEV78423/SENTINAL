import { PROVIDERS, TASK_TYPES, type ProviderPreferences, type ProviderSecretStatus } from "./provider-state.js";

export interface SidebarTemplateInput {
  iconUri: string;
  nonce: string;
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "gemini": return "Gemini";
    case "grok": return "Grok";
    case "openrouter": return "OpenRouter";
    case "nvidia-nim": return "NVIDIA NIM";
    case "groq": return "Groq";
    case "openai": return "OpenAI";
    case "anthropic": return "Anthropic";
    case "minimax": return "Minimax";
    case "cohere": return "Cohere";
    case "mistral": return "Mistral";
    case "together-ai": return "Together AI";
    case "perplexity": return "Perplexity";
    case "deepseek": return "DeepSeek";
    case "azure-openai": return "Azure OpenAI";
    default: return provider;
  }
}

function taskLabel(task: string): string {
  switch (task) {
    case "contradictionDetection":
      return "Contradiction detection";
    case "badPracticeAnalysis":
      return "Bad practice analysis";
    case "promptCompression":
      return "Prompt compression";
    case "vaultSummarization":
      return "Vault summarization";
    default:
      return task;
  }
}

function renderSettingsSection(preferences?: ProviderPreferences, secrets?: Record<string, ProviderSecretStatus>): string {
  const modelAssignments = preferences?.modelAssignments ?? {
    contradictionDetection: "",
    badPracticeAnalysis: "",
    promptCompression: "",
    vaultSummarization: ""
  };
  const defaultProvider = preferences?.defaultProvider ?? "gemini";
  const syncTarget = preferences?.syncTarget ?? "";
  return /* html */ `
    <div class="settings-grid">
      <label class="field">
        <span>Default provider</span>
        <select id="defaultProvider">
          ${PROVIDERS.map((provider) => `<option value="${provider}"${provider === defaultProvider ? " selected" : ""}>${providerLabel(provider)}</option>`).join("")}
        </select>
      </label>
      <label class="field">
        <span>Sync target</span>
        <input id="syncTarget" type="text" value="${syncTarget}" placeholder="Optional vault sync path" />
      </label>
      <div class="field field-wide">
        <span>Task model assignments</span>
        ${TASK_TYPES.map((task) => `
          <label class="inline-field">
            <span>${taskLabel(task)}</span>
            <input id="model-${task}" type="text" value="${modelAssignments[task] ?? ""}" placeholder="Model name" />
          </label>
        `).join("")}
      </div>
      <div class="field field-wide">
        <span>Provider API keys</span>
        ${PROVIDERS.map((provider) => {
          const status = secrets?.[provider] ?? { configured: false, masked: "Not set" };
          return `
            <div class="provider-row" data-provider="${provider}">
              <div class="provider-meta">
                <strong>${providerLabel(provider)}</strong>
                <span class="muted secret-status">${status.masked}</span>
              </div>
              <input class="secret-input" id="secret-${provider}" type="password" placeholder="Paste a new key to save" autocomplete="off" />
              <div class="row">
                <button data-settings-action="save-secret" data-provider="${provider}">Save Key</button>
                <button data-settings-action="clear-secret" data-provider="${provider}" class="secondary">Clear Key</button>
                <button data-settings-action="test-connection" data-provider="${provider}" class="secondary">Test Connection</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="row">
        <button data-settings-action="save-preferences">Save Settings</button>
      </div>
    </div>
  `;
}

export function buildSidebarTemplate({ iconUri, nonce }: SidebarTemplateInput): string {
  const style = `
    :root {
      --bg: #08101d;
      --panel: #0f172a;
      --panel-border: #25324a;
      --text: #e5e7eb;
      --muted: #9ca9bd;
      --emerald: #22c55e;
      --gold: #d4af37;
      --ink: #020617;
    }
    body { font-family: system-ui, sans-serif; margin: 0; color: var(--text); background: radial-gradient(circle at top, rgba(34,197,94,0.08), transparent 36%), linear-gradient(180deg, #08101d 0%, #0b1020 100%); }
    .wrap { padding: 16px; display: grid; gap: 12px; }
    .panel { background: linear-gradient(180deg, rgba(15,23,42,0.96), rgba(12,18,32,0.96)); border: 1px solid var(--panel-border); border-radius: 18px; padding: 14px; box-shadow: 0 18px 40px rgba(2,6,23,0.28); }
    .hero { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .hero-icon { width: 56px; height: 56px; border-radius: 16px; background: rgba(2,6,23,0.7); border: 1px solid rgba(212,175,55,0.45); padding: 8px; box-sizing: border-box; }
    .eyebrow { color: var(--gold); font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 700; margin-bottom: 3px; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: 0.08em; color: var(--text); }
    .muted { color: var(--muted); }
    .ring { width: 120px; height: 120px; border-radius: 999px; border: 10px solid var(--emerald); display: grid; place-items: center; font-size: 28px; font-weight: 700; color: var(--text); background: radial-gradient(circle at center, rgba(212,175,55,0.18), rgba(34,197,94,0.06) 45%, transparent 60%); box-shadow: inset 0 0 0 1px rgba(212,175,55,0.15); }
    button { background: linear-gradient(180deg, var(--emerald), #15803d); color: white; border: 0; border-radius: 10px; padding: 10px 12px; cursor: pointer; font-weight: 600; }
    button.secondary { background: linear-gradient(180deg, #28344b, #1f2937); }
    .row { display: flex; gap: 8px; flex-wrap: wrap; }
    .badge { display: inline-flex; padding: 4px 8px; border-radius: 999px; background: #1f2937; border: 1px solid rgba(212,175,55,0.25); }
    .tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
    .tab { background:#172033; color:#cbd5e1; padding:8px 10px; border-radius:999px; cursor:pointer; border:1px solid transparent; }
    .tab.active { border-color: var(--gold); color:#fff; box-shadow: 0 0 0 1px rgba(34,197,94,0.18) inset; }
    .section { display:none; }
    .section.active { display:block; }
    textarea, input, select {
      width: 100%;
      border-radius: 12px;
      border: 1px solid #334155;
      background: var(--ink);
      color: var(--text);
      padding: 10px 12px;
      box-sizing: border-box;
    }
    textarea { min-height: 220px; resize: vertical; }
    pre { white-space: pre-wrap; word-break: break-word; }
    .settings-grid { display: grid; gap: 12px; }
    .field { display: grid; gap: 6px; }
    .field > span, .inline-field > span { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold); font-weight: 700; }
    .field-wide { gap: 10px; }
    .inline-field { display: grid; gap: 6px; }
    .provider-row { display: grid; gap: 8px; padding: 12px; border: 1px solid rgba(37,50,74,0.9); border-radius: 14px; background: rgba(2,6,23,0.5); }
    .provider-meta { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
    .secret-input { width: 100%; }
  `;

  return /* html */ `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${iconUri} https: data:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>${style}</style>
    </head>
    <body>
      <div class="wrap">
        <div class="panel">
          <div class="hero">
            <img class="hero-icon" src="${iconUri}" alt="Sentinel" />
            <div>
              <div class="eyebrow">Sentinel</div>
              <div class="brand">SENTINAL</div>
            </div>
          </div>
          <div class="row" style="align-items:center; justify-content:space-between;">
            <div>
              <div class="muted">Shared brand chrome</div>
              <div style="font-size:18px; font-weight:700;">Health Score</div>
            </div>
            <div>
              <div class="ring" id="scoreRing">100</div>
              <div id="deltaBadge" class="badge" style="margin-top:8px; justify-content:center; width:100%; text-align:center;">0</div>
            </div>
          </div>
          <div class="row" style="margin-top:12px;">
            <button data-cmd="start">Start Session</button>
            <button data-cmd="end" class="secondary">End Session</button>
            <button data-cmd="copy" class="secondary">Copy Bootstrap</button>
            <button data-cmd="regenerate-bootstrap" class="secondary">Regenerate Bootstrap</button>
            <button data-cmd="log-decision" class="secondary">Log Decision</button>
            <button data-cmd="add-override" class="secondary">Add Override</button>
            <button data-cmd="resolve-contradiction" class="secondary">Resolve Contradiction</button>
          </div>
        </div>
        <div class="panel">
          <div class="tabs" id="tabs">
            <span class="tab active" data-tab="home">Home</span>
            <span class="tab" data-tab="session">Session</span>
            <span class="tab" data-tab="bootstrap">Bootstrap</span>
            <span class="tab" data-tab="vault">Vault</span>
            <span class="tab" data-tab="mcp">MCP Hub</span>
            <span class="tab" data-tab="reports">Reports</span>
            <span class="tab" data-tab="settings">Settings</span>
          </div>
          <div class="section active" id="tab-home">
            <div class="muted">Navigation and status live here. The score ring and delta use the shared emerald and gold palette.</div>
          </div>
          <div class="section" id="tab-session">
            <pre id="sessionView"></pre>
          </div>
          <div class="section" id="tab-bootstrap">
            <textarea id="bootstrapEditor" spellcheck="false"></textarea>
            <div class="row" style="margin-top:8px;">
              <button data-cmd="save-bootstrap">Save Bootstrap</button>
              <button data-cmd="copy" class="secondary">Copy Bootstrap</button>
            </div>
          </div>
          <div class="section" id="tab-vault">
            <pre id="vaultView"></pre>
          </div>
          <div class="section" id="tab-mcp">
            <div class="muted">MCP servers are configured from the Universal MCP Hub. Claude config is written to the project's .sentinel folder.</div>
          </div>
          <div class="section" id="tab-reports">
            <pre id="reportsView"></pre>
          </div>
          <div class="section" id="tab-settings">
            <div class="muted" style="margin-bottom: 10px;">Provider secrets stay in VS Code SecretStorage. Model preferences and sync settings stay in workspace state.</div>
            <div id="settingsRoot">${renderSettingsSection()}</div>
            <div id="settingsNotice" class="badge" style="margin-top: 12px;">Provider secrets are stored locally.</div>
          </div>
        </div>
        <div class="panel">
          <div class="muted">State</div>
          <div id="notice" style="margin:8px 0; color:#cbd5e1;"></div>
          <pre id="state" style="white-space:pre-wrap; margin:0;"></pre>
        </div>
      </div>
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const taskIds = ["contradictionDetection", "badPracticeAnalysis", "promptCompression", "vaultSummarization"];
        const providerIds = ["gemini", "grok", "openrouter", "nvidia-nim", "groq", "openai", "anthropic", "minimax", "cohere", "mistral", "together-ai", "perplexity", "deepseek", "azure-openai"];

        function currentProviderSettings() {
          return {
            defaultProvider: document.getElementById("defaultProvider")?.value ?? "gemini",
            syncTarget: document.getElementById("syncTarget")?.value ?? "",
            modelAssignments: Object.fromEntries(taskIds.map((task) => [task, document.getElementById("model-" + task)?.value ?? ""]))
          };
        }

        function applySettingsState(state) {
          const settings = state?.providerSettings ?? {};
          const secretStatus = state?.secretStatus ?? {};
          const defaultProvider = document.getElementById("defaultProvider");
          const syncTarget = document.getElementById("syncTarget");
          const notice = document.getElementById("settingsNotice");
          if (defaultProvider && document.activeElement !== defaultProvider) {
            defaultProvider.value = settings.defaultProvider ?? "gemini";
          }
          if (syncTarget && document.activeElement !== syncTarget) {
            syncTarget.value = settings.syncTarget ?? "";
          }
          taskIds.forEach((task) => {
            const input = document.getElementById("model-" + task);
            if (input && document.activeElement !== input) {
              input.value = settings?.modelAssignments?.[task] ?? "";
            }
          });
          providerIds.forEach((provider) => {
            const status = document.querySelector('[data-provider="' + provider + '"] .secret-status');
            if (status) {
              status.textContent = secretStatus?.[provider]?.masked ?? "Not set";
            }
            const input = document.getElementById("secret-" + provider);
            if (input && document.activeElement !== input) {
              input.value = "";
            }
          });
          if (notice) {
            notice.textContent = state?.connectionNotice ?? "Provider secrets are stored locally.";
          }
        }

        function sendMessage(command, payload = {}) {
          vscode.postMessage({ type: "sentinel/command", command, ...payload });
        }

        document.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return;
          }
          const tab = target.closest(".tab");
          if (tab) {
            document.querySelectorAll(".tab").forEach((node) => node.classList.remove("active"));
            document.querySelectorAll(".section").forEach((node) => node.classList.remove("active"));
            tab.classList.add("active");
            const selected = document.getElementById("tab-" + tab.getAttribute("data-tab"));
            if (selected) {
              selected.classList.add("active");
            }
            return;
          }
          const actionButton = target.closest("[data-cmd], [data-settings-action]");
          if (!actionButton) {
            return;
          }
          if (actionButton.hasAttribute("data-cmd")) {
            const command = actionButton.getAttribute("data-cmd");
            if (command === "save-bootstrap") {
              sendMessage(command, { content: document.getElementById("bootstrapEditor")?.value ?? "" });
            } else {
              sendMessage(command === "log-decision" ? "logDecision" : command === "add-override" ? "addOverride" : command === "resolve-contradiction" ? "resolveContradiction" : command);
            }
            return;
          }
          const action = actionButton.getAttribute("data-settings-action");
          const provider = actionButton.getAttribute("data-provider");
          if (action === "save-preferences") {
            sendMessage("save-provider-preferences", { preferences: currentProviderSettings() });
          } else if (action === "save-secret" && provider) {
            sendMessage("save-provider-secret", { provider, value: document.getElementById("secret-" + provider)?.value ?? "" });
          } else if (action === "clear-secret" && provider) {
            sendMessage("clear-provider-secret", { provider });
          } else if (action === "test-connection" && provider) {
            sendMessage("test-provider-connection", { provider });
          }
        });

        window.addEventListener("message", (event) => {
          const message = event.data;
          if (message?.type === "sentinel/state") {
            const score = message?.state?.score?.total ?? 0;
            const delta = message?.state?.score?.delta ?? 0;
            const ring = document.getElementById("scoreRing");
            const deltaBadge = document.getElementById("deltaBadge");
            const bootstrapEditor = document.getElementById("bootstrapEditor");
            document.getElementById("notice").textContent = message?.state?.notice ?? "";
            ring.textContent = String(score);
            ring.style.borderColor = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
            deltaBadge.textContent = (delta >= 0 ? "+" : "") + String(delta);
            deltaBadge.style.background = delta > 0 ? "#14532d" : delta < 0 ? "#7f1d1d" : "#374151";
            document.getElementById("state").textContent = JSON.stringify(message.state, null, 2);
            document.getElementById("sessionView").textContent = JSON.stringify(message?.state?.session ?? null, null, 2);
            document.getElementById("vaultView").textContent = JSON.stringify({
              openContradictions: message?.state?.openContradictions ?? [],
              findings: message?.state?.findings ?? [],
              decisions: message?.state?.decisions ?? []
            }, null, 2);
            document.getElementById("reportsView").textContent = JSON.stringify({
              reportCount: message?.state?.reportCount ?? 0
            }, null, 2);
            if (bootstrapEditor && document.activeElement !== bootstrapEditor) {
              bootstrapEditor.value = message?.state?.bootstrapPrompt ?? "";
            }
            applySettingsState(message.state);
          }
          if (message?.type === "sentinel/bootstrap") {
            document.getElementById("bootstrapEditor").value = message?.content ?? "";
          }
        });
      </script>
    </body>
  </html>
  `;
}
