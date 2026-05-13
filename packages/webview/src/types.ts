import { HealthScoreSnapshot, SessionRecord } from "@sentinel/core";

export interface SentinelWebviewState {
  session: SessionRecord | null;
  score: HealthScoreSnapshot | null;
  files: number;
  gitAvailable: boolean;
  notice: string;
  bootstrapPrompt: string;
  openContradictions: any[];
  findings: any[];
  decisions: any[];
  reportCount: number;
  providerSettings: any;
  secretStatus: Record<string, any>;
  connectionNotice: string;
}

export interface SentinelWebviewMessage {
  type: "sentinel/state" | "sentinel/command";
  state?: SentinelWebviewState;
  command?: string;
}

