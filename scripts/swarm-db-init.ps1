#Requires -Version 5.1
<#
.SYNOPSIS
  Apply API-compatible schema + seeds to Swarm Postgres on overlay ubi_public.
.DESCRIPTION
  Default: api/dev-schema.sql, dev-seed.sql, dev-patch.sql (same as docker-compose.local.yml).
  Set $env:SWARM_DB_MODE = 'full' to run migrations/000_run_all_migrations.sql instead (see README).
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Network = if ($env:UBI_SWARM_NETWORK) { $env:UBI_SWARM_NETWORK } else { 'ubi_public' }
$DbUser = if ($env:DB_USER) { $env:DB_USER } else { 'postgres' }
$DbPass = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { 'postgres' }
$DbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'ubi_cms' }
$Mode = if ($env:SWARM_DB_MODE) { $env:SWARM_DB_MODE } else { 'dev' }
$Img = if ($env:POSTGRES_IMAGE) { $env:POSTGRES_IMAGE } else { 'postgres:16-alpine' }

function Invoke-PsqlFile {
    param([string]$WorkRel, [string]$File)
    Write-Host ">>> psql -f $File (cwd $WorkRel)"
    docker run --rm --network $Network `
        -v "${Root}:/work:ro" `
        -w "/work/$WorkRel" `
        -e "PGPASSWORD=$DbPass" `
        $Img `
        psql -h postgres -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f $File
}

Write-Host "==> Waiting for Postgres (${DbUser}@postgres:5432/${DbName}) on network $Network ..."
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    docker run --rm --network $Network -e "PGPASSWORD=$DbPass" $Img pg_isready -h postgres -U $DbUser -d $DbName -q 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Error "Postgres did not become ready. Deploy ubi_core first and ensure overlay $Network exists."
}

if ($Mode -eq 'full') {
    Write-Host "==> SWARM_DB_MODE=full: migrations/000_run_all_migrations.sql"
    Invoke-PsqlFile -WorkRel 'migrations' -File '000_run_all_migrations.sql'
} else {
    Write-Host '==> SWARM_DB_MODE=dev: dev-schema -> dev-seed -> dev-patch'
    Invoke-PsqlFile -WorkRel 'api' -File 'dev-schema.sql'
    Invoke-PsqlFile -WorkRel 'api' -File 'dev-seed.sql'
    Invoke-PsqlFile -WorkRel 'api' -File 'dev-patch.sql'
}

Write-Host '==> Database init finished.'
