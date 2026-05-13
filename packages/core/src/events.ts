export const SENTINEL_EVENTS = {
  SESSION_STARTED: "sentinel/session-started",
  SESSION_ENDED: "sentinel/session-ended",
  WORKSPACE_UPDATED: "sentinel/workspace-updated",
  BOOTSTRAP_UPDATED: "sentinel/bootstrap-updated",
  REPORT_GENERATED: "sentinel/report-generated",
  VAULT_UPDATED: "sentinel/vault-updated",
  CONTRADICTION_DETECTED: "sentinel/contradiction-detected",
  CONTRADICTION_RESOLVED: "sentinel/contradiction-resolved"
} as const;

export type SentinelEventName = typeof SENTINEL_EVENTS[keyof typeof SENTINEL_EVENTS];

