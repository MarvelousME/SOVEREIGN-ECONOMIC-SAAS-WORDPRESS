# Opens common URLs for docker-compose.dev.yml (Podman: podman compose -f docker-compose.dev.yml).
# Run from repo root: powershell -File scripts/open-stack-urls.ps1

$urls = @(
    @{ Name = "API health"; Url = "http://localhost:3000/health" }
    @{ Name = "Portal UI"; Url = "http://localhost:3001" }
    @{ Name = "Keycloak"; Url = "http://localhost:8080" }
    @{ Name = "Traefik dashboard"; Url = "http://localhost:8081/dashboard/" }
    @{ Name = "MinIO console"; Url = "http://localhost:9001" }
    @{ Name = "Temporal UI"; Url = "http://localhost:8233" }
    @{ Name = "NATS monitoring"; Url = "http://localhost:8222" }
    @{ Name = "Traefik HTTP (gateway)"; Url = "http://localhost:2025" }
)

foreach ($item in $urls) {
    Write-Host "Opening $($item.Name): $($item.Url)"
    Start-Process $item.Url
}
