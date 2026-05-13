#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VSIX_PATH="$(ls "$ROOT_DIR"/packages/extension/sentinel-vscode-*.vsix 2>/dev/null | head -n 1)"

cd "$ROOT_DIR"
npm install
npm run build
npm run package -w sentinel-vscode
npm install -g ./packages/cli

if [[ -n "$VSIX_PATH" ]] && command -v code >/dev/null 2>&1; then
  code --install-extension "$VSIX_PATH" --force
fi

echo "Sentinel installed. VSIX: $VSIX_PATH"
