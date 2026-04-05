# Optional local stack: MailHog + OpenSearch
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Compose = Join-Path $Root "docker-compose.local-extras.yml"

Write-Host "Starting optional local stack (MailHog + OpenSearch)..."
docker compose -f $Compose up -d

Write-Host ""
Write-Host "MailHog UI:  http://localhost:8025"
Write-Host "SMTP:        localhost:1025"
Write-Host "OpenSearch:  http://localhost:9200"
Write-Host "Done."
