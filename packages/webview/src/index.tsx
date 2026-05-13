import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { SentinelWebviewState, SentinelWebviewMessage } from "./types.js";
import "./styles.css";

declare const acquireVsCodeApi: undefined | (() => {
  postMessage(message: SentinelWebviewMessage): void;
});

const api = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;

const state: SentinelWebviewState = {
  session: null,
  score: null,
  files: 0,
  gitAvailable: false,
  notice: "",
  bootstrapPrompt: "",
  openContradictions: [],
  findings: [],
  decisions: [],
  reportCount: 0,
  providerSettings: {},
  secretStatus: {},
  connectionNotice: ""
};

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <App
      initialState={state}
      onCommand={(command, args) => {
        api?.postMessage({ type: "sentinel/command", command, ...args });
      }}
    />
  );
}
