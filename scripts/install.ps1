Param()

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$VsixPath = Get-ChildItem -Path (Join-Path $RootDir "packages/extension") -Filter "sentinel-vscode-*.vsix" | Select-Object -First 1 -ExpandProperty FullName

Set-Location $RootDir
npm install
npm run build
npm run package -w sentinel-vscode
npm install -g .\packages\cli

if ($VsixPath -and (Get-Command code -ErrorAction SilentlyContinue)) {
  code --install-extension $VsixPath --force
}

Write-Host "Sentinel installed. VSIX: $VsixPath"
