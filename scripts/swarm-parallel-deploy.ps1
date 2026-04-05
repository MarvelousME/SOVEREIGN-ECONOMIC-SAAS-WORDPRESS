#Requires -Version 5.1
<#
.SYNOPSIS
  Parallel Docker image builds + parallel docker stack deploy for ubi_core and ubi_observe.
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Network = if ($env:UBI_SWARM_NETWORK) { $env:UBI_SWARM_NETWORK } else { 'ubi_public' }
if (-not $env:NEXT_PUBLIC_API_URL) { $env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:3000/api/v1' }

Write-Host '==> Swarm init (if needed)'
docker swarm init 2>$null

Write-Host "==> Overlay network: $Network"
$exists = docker network ls -q -f "name=^${Network}$"
if (-not $exists) { docker network create -d overlay --attachable $Network }

$apiImage = if ($env:API_IMAGE) { $env:API_IMAGE } else { 'ubi-cms-api:swarm' }
$portalImage = if ($env:PORTAL_IMAGE) { $env:PORTAL_IMAGE } else { 'ubi-cms-portal:swarm' }

Write-Host '==> Parallel image builds'
$jobApi = Start-Job -ScriptBlock {
    param($R, $Img)
    docker build -t $Img -f "$R\api\Dockerfile" "$R\api"
} -ArgumentList $Root, $apiImage

$jobPortal = Start-Job -ScriptBlock {
    param($R, $Img, $ApiUrl)
    $env:NEXT_PUBLIC_API_URL = $ApiUrl
    docker build -t $Img --build-arg "NEXT_PUBLIC_API_URL=$ApiUrl" -f "$R\frontend\portal-ui\Dockerfile" "$R\frontend\portal-ui"
} -ArgumentList $Root, $portalImage, $env:NEXT_PUBLIC_API_URL

Wait-Job $jobApi, $jobPortal | Out-Null
Receive-Job $jobApi
Receive-Job $jobPortal
Remove-Job $jobApi, $jobPortal

Write-Host "==> Parallel stack deploy (core + observe$(if ($env:DEPLOY_DB_INIT_STACK -eq '1') { ' + db_init' }))"
$swarmDir = Join-Path $Root 'docker\swarm'
$jobCore = Start-Job -ScriptBlock {
    param($D)
    Set-Location $D
    docker stack deploy -c stack-core.yml ubi_core
} -ArgumentList $swarmDir

$jobObs = Start-Job -ScriptBlock {
    param($D)
    Set-Location $D
    docker stack deploy -c stack-observe.yml ubi_observe
} -ArgumentList $swarmDir

$jobs = @($jobCore, $jobObs)
if ($env:DEPLOY_DB_INIT_STACK -eq '1') {
    $jobDb = Start-Job -ScriptBlock {
        param($D)
        Set-Location $D
        docker stack deploy -c stack-db-init.yml ubi_db_init
    } -ArgumentList $swarmDir
    $jobs += $jobDb
}

Wait-Job $jobs | Out-Null
foreach ($j in $jobs) { Receive-Job $j; Remove-Job $j }

Write-Host ''
Write-Host 'Stacks: ubi_core, ubi_observe | API :3000 Portal :3001 OPA :8181 Grafana :3010'
if ($env:DEPLOY_DB_INIT_STACK -eq '1') {
    Write-Host 'DB init: docker service logs -f ubi_db_init_dbinit'
}

if ($env:RUN_SWARM_DB_INIT -eq '1') {
    Write-Host ''
    Write-Host '==> RUN_SWARM_DB_INIT=1: applying schema + seeds'
    & (Join-Path $Root 'scripts\swarm-db-init.ps1')
}
