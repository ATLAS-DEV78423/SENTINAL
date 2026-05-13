Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

npm install
npm run build

Write-Host "Sentinel installed and built."
