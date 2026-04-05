# Monorepo playbook — UBI CMS

Operational checklist and improvement backlog for this repository’s **multi-package layout** (`api/`, `frontend/`, `services/*`).  
**Normative decision:** [ADR 0001 — Monorepo repository layout](./adr/0001-monorepo-repository-layout.md).

---

## Current state (quick audit)

| Item | Today |
|------|--------|
| Root workspaces | None (`package.json` is orchestration helpers) |
| Lockfiles | Per package (`api`, `portal-ui`, each `services/*`) |
| CI (Node) | `.github/workflows/ci.yml` — API tests + Portal build/lint/type-check |
| Container builds | `.github/workflows/build.yml` — matrix per service |

---

## Checklist — contributors

- [ ] Work in the **correct package directory** (`api`, `frontend/portal-ui`, or `services/<name>`).
- [ ] Run **`npm ci`** (not `npm install`) in that directory when touching dependencies.
- [ ] Run **tests** from that package (`npm test` or project-specific script).
- [ ] For portal: `npm run type-check` and `npm run lint` before pushing.
- [ ] Root **`npm run local:up`** / Compose only starts the **local** stack; it does not install all services.

---

## Checklist — maintainers (backlog)

### Quick wins

- [ ] Add **path filters** to GitHub Actions so `portal-build` runs only when `frontend/**` changes and `api-test` when `api/**` changes (optional: `dorny/paths-filter` or native `paths:`).
- [ ] Document **which services** must pass tests in CI vs. image-only builds (if intentional).
- [ ] Align **`engines`** / Node version across packages with `.github/workflows` `NODE_VERSION` (resolve mismatches e.g. packages requiring Node 24).

### Medium effort

- [ ] Introduce **pnpm workspaces** (or npm workspaces) with explicit `packages:` globs — phased: start with `api` + `frontend/portal-ui` + one pilot service.
- [ ] Add **Turborepo** (`turbo.json`) for `build`, `test`, `lint` with cache; root scripts `turbo run test`, etc.
- [ ] Add **`packages/tsconfig`** and/or **`packages/eslint-config`** if duplication becomes painful.

### Longer term

- [ ] Shared **API types** or OpenAPI-generated client in `packages/` consumed by portal and services.
- [ ] **Remote cache** for Turborepo in CI (after local adoption proves useful).

---

## Verification commands (examples)

```bash
# API
cd api && npm ci && npm run test:ci

# Portal
cd frontend/portal-ui && npm ci && npm run type-check && npm run lint && npm run build

# One service (replace name)
cd services/agent-runner && npm ci && npm test   # if test script exists
```

---

## Related docs

- [ADR 0001 — Monorepo repository layout](./adr/0001-monorepo-repository-layout.md)
- [Architecture decisions](./architecture-decisions.md)
- [Developer guide](./developer-guide.md)
