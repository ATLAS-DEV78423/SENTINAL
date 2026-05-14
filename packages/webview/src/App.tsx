import React, { useState } from "react";
import { SentinelWebviewState } from "./types.js";

export interface AppProps {
  initialState: SentinelWebviewState;
  onCommand: (command: string, args?: any) => void;
}

const theme = {
  bg: "#0f172a",
  panelBg: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  accent: "#3b82f6",
  success: "#22c55e",
  warning: "#eab308",
  danger: "#ef4444",
};

export function App({ initialState, onCommand }: AppProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<string>("Home");
  const [bootstrapText, setBootstrapText] = useState(initialState.bootstrapPrompt || "");

  const score = initialState.score?.total ?? 100;
  const tabs = ["Home", "Session", "Bootstrap", "Vault", "MCP", "Reports", "Settings"];

  const renderTabContent = () => {
    switch (activeTab) {
      case "Home":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Health Score</h2>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                border: `6px solid ${score >= 80 ? theme.success : score >= 50 ? theme.warning : theme.danger}`,
                display: "grid", placeItems: "center", fontSize: 24, fontWeight: "bold"
              }}>
                {score}
              </div>
            </div>
            <div style={{ color: theme.textMuted, fontSize: 14 }}>{initialState.notice}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {initialState.session?.status !== "active" ? (
                <button style={btnStyle(theme.success)} onClick={() => onCommand("start")}>Start Session</button>
              ) : (
                <button style={btnStyle(theme.border)} onClick={() => onCommand("end")}>End Session</button>
              )}
            </div>
          </div>
        );
      case "Session":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Active Session</h2>
            <div style={{ fontSize: 14 }}>
              <strong>Open Contradictions:</strong> {initialState.openContradictions?.length || 0}
            </div>
            <div style={{ fontSize: 14 }}>
              <strong>Bad Practices Flagged:</strong> {initialState.findings?.length || 0}
            </div>
            <button style={btnStyle(theme.border)} onClick={() => onCommand("resolveContradiction")}>Resolve Contradiction</button>
            <button style={btnStyle(theme.border)} onClick={() => onCommand("logDecision")}>Log Decision</button>
          </div>
        );
      case "Bootstrap":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <textarea 
              value={bootstrapText}
              onChange={(e) => setBootstrapText(e.target.value)}
              style={{ width: "100%", height: 150, background: "#000", color: "#fff", border: `1px solid ${theme.border}`, padding: 8, borderRadius: 4 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnStyle(theme.accent)} onClick={() => onCommand("save-bootstrap", { content: bootstrapText })}>Save</button>
              <button style={btnStyle(theme.border)} onClick={() => onCommand("regenerate-bootstrap")}>Regenerate</button>
              <button style={btnStyle(theme.border)} onClick={() => onCommand("copy")}>Copy</button>
            </div>
          </div>
        );
      case "Vault":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
             <h2 style={{ margin: 0, fontSize: 18 }}>Vault</h2>
             <div style={{ fontSize: 14, color: theme.textMuted }}>Decisions: {initialState.decisions?.length || 0}</div>
             <button style={btnStyle(theme.border)} onClick={() => onCommand("syncVault")}>Sync Global Vault</button>
          </div>
        );
      case "MCP":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
             <h2 style={{ margin: 0, fontSize: 18 }}>MCP Hub</h2>
             <div style={{ fontSize: 14, color: theme.textMuted }}>MCP configuration is managed via IDE specific configurations.</div>
          </div>
        );
      case "Reports":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
             <h2 style={{ margin: 0, fontSize: 18 }}>Reports</h2>
             <div style={{ fontSize: 14, color: theme.textMuted }}>Total Reports: {initialState.reportCount || 0}</div>
             <button style={btnStyle(theme.border)} onClick={() => onCommand("exportReport")}>View Latest Report</button>
          </div>
        );
      case "Settings":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
             <h2 style={{ margin: 0, fontSize: 18 }}>Settings</h2>
             <div style={{ fontSize: 14, color: theme.textMuted }}>Provider: {initialState.providerSettings?.defaultProvider || "Not set"}</div>
             <button style={btnStyle(theme.border)} onClick={() => onCommand("test-provider-connection", { provider: initialState.providerSettings?.defaultProvider })}>Test Connection</button>
             <button style={btnStyle(theme.border)} onClick={() => onCommand("initProject")}>Run Wizard</button>
             <button style={btnStyle(theme.border)} onClick={() => onCommand("addOverride")}>Add Override</button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: theme.bg, color: theme.text, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${theme.border}`, padding: "8px 8px 0" }}>
        {tabs.map(tab => (
          <div 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: "8px 12px", 
              cursor: "pointer", 
              borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : "none",
              color: activeTab === tab ? theme.text : theme.textMuted,
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 400
            }}
          >
            {tab}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {renderTabContent()}
      </div>
    </div>
  );
}

export const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600
});
