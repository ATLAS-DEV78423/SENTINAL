import * as vscode from "vscode";
import { buildSidebarTemplate } from "./sidebar-template.js";

export function buildSidebarHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = Date.now().toString(36);
  const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "icon.svg")).toString();
  return buildSidebarTemplate({ iconUri, nonce });
}
