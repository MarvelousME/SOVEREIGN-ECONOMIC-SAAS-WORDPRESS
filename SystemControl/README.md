# SystemControl

Windows batch controls for managing the local Podman stack from this repo.

## Default Compose File

All scripts default to:

- `docker-compose.dev.yml`

Override it per terminal session with:

```bat
set COMPOSE_FILE_PATH=C:\path\to\docker-compose.local.yml
```

## Stack Controls

- `up-all.bat` - Build and start all services in the active compose file.
- `up-all.bat --no-build` - Start without building.
- `down-all.bat` - Stop and remove stack resources.
- `down-all.bat --volumes` - Also remove volumes.
- `podman-version.bat` - Verify Podman + compose availability/version.
- `podman-info.bat` - Show Podman runtime details and compose service/container status.
- `project-status.bat` - One-shot stack snapshot (versions, services, status, core logs).
- `events-health.bat` - Event-path checks (service presence, recent logs, host probes).

## Service Controls (single or multiple)

- `start-services.bat service1 [service2 ...]`
- `stop-services.bat service1 [service2 ...]`
- `logs-services.bat service1 [service2 ...] [--tail N] [--no-follow]`

Examples:

```bat
start-services.bat api nats temporal
stop-services.bat api nats
logs-services.bat api nats --tail 300
logs-services.bat api --no-follow --tail 1000
```

The scripts validate requested service names against the current compose file and skip unknown names with a warning.

## Notifications + Events Shortcut Group

Pre-wired helpers for the common event/notification path:

- `events-notifications-up.bat`
- `events-notifications-down.bat`
- `events-notifications-logs.bat [--tail N] [--no-follow]`

These target:

- `nats`, `temporal`, `postgres`, `redis`, `api`, `workflows`, `ubi-engine`, `notifications-service`, `agent-runner`

If some services are not present in your active compose file, they are skipped with warnings.
