# SystemControl

Windows batch controls for managing the local Podman stack from this repo.

## Stack Profiles (local parity with prod switching)

All scripts can switch stacks by profile:

- `local` -> `docker-compose.local.yml` + `.env`
- `dev` -> `docker-compose.dev.yml` + `.env`
- `staging` -> `docker-compose.staging.yml` + `.env.staging` (falls back to `.env` if missing)
- `prod` -> `docker-compose.prod.yml` + `.env.production` (falls back to `.env` if missing)
- `security` -> `docker-compose.security.yml` + `.env`

Set profile per terminal session:

```bat
set STACK_PROFILE=staging
```

Override compose/env path directly when needed:

```bat
set COMPOSE_FILE_PATH=C:\path\to\docker-compose.custom.yml
set ENV_FILE_PATH=C:\path\to\.env.custom
```

## Stack Controls

- `up-all.bat` - Build and start all services in the active compose file.
- `up-all.bat --no-build` - Start without building.
- `down-all.bat` - Stop and remove stack resources.
- `down-all.bat --volumes` - Also remove volumes.
- `podman-all-up.bat` - Alias for `up-all.bat`.
- `podman-all-down.bat` - Alias for `down-all.bat`.
- `podman-version.bat` - Verify Podman + compose availability/version.
- `podman-info.bat` - Show Podman runtime details and compose service/container status.
- `project-status.bat` - One-shot stack snapshot (versions, services, status, core logs).
- `events-health.bat` - Event-path checks (service presence, recent logs, host probes).
- `stack-up.bat <profile> [--no-build]` - One-command profile-based startup.
- `stack-down.bat <profile> [--volumes]` - One-command profile-based shutdown.
- `stack-status.bat <profile>` - One-command profile-based status snapshot.

## Service Controls (single or multiple)

- `start-services.bat service1 [service2 ...]`
- `stop-services.bat service1 [service2 ...]`
- `podman-startservices.bat service1 [service2 ...]` (alias)
- `podman-stopservices.bat service1 [service2 ...]` (alias)
- `logs-services.bat service1 [service2 ...] [--tail N] [--no-follow]`

Examples:

```bat
start-services.bat api nats temporal
stop-services.bat api nats
logs-services.bat api nats --tail 300
logs-services.bat api --no-follow --tail 1000

stack-up.bat local
stack-up.bat prod --no-build
stack-status.bat security
stack-down.bat dev --volumes
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
