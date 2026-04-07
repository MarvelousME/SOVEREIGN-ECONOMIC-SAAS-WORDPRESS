# Generated architecture outputs

The **Portal UI** interactive system map (React Flow / `@xyflow/react`) writes files here when you use **Save to repo** or **Live save** (debounced).

## Where to use it in the app

| Route | Audience | Purpose |
|-------|----------|---------|
| **Dashboard → Admin → Architecture** | `admin` / `developer` | Full service map: infra, core, platform, edge. |
| **Dashboard → Admin → Workflows** | `admin` / `developer` | Same canvas; copy explains **Temporal triggers** (manual, schedule, NATS, API) and **workflow type** nodes wired to the worker. |

Implementation: `frontend/portal-ui/src/components/system-architecture/` (`architecture-canvas.tsx`, `architecture-data.ts`, `system-node.tsx`), palette helpers in `frontend/portal-ui/src/lib/architecture/`.

Baseline diagram includes **four trigger** nodes and **nine** `workflows/src/workflows/*.ts` workflow labels, plus existing services. Drag nodes, connect handles for **proposed** edges (orange), drag palette items from the right rail. **Suggestions preview** updates immediately as the graph changes.

## Outputs (after save)

| Path | Purpose |
|------|---------|
| `outputs/layout.json` | Full React Flow snapshot (nodes, edges, positions). |
| `outputs/wiring-manifest.json` | Summary list of nodes and edges; **`proposedEdges`** includes per-edge **`composeHints`** (env, depends_on, docs). |
| `outputs/wiring-suggestions.md` | Human-readable diff: palette-only nodes, proposed edges, compose checklist. |
| `outputs/docker-compose.fragment.yml` | Commented service stubs for palette paths; merge manually into compose. |
| `outputs/scripts/apply-wiring.ps1` | Windows: finds repo root, runs `docker compose -f docker-compose.dev.yml build` + `up -d`. |
| `outputs/scripts/apply-wiring.sh` | Unix: same as above. |

The `outputs/` directory is **gitignored** by default.

## Save behaviour

1. **Save to repo** — `POST /api/architecture/wiring` once; shows success/error toast.
2. **Live save** (checkbox on the canvas) — debounced (~420 ms) writes after you drag or connect. Requires the same **write secret** as below; skips silently if the secret is missing; skips if the JSON is unchanged.
3. Optional **write secret** in the UI is stored in **`sessionStorage`** only; it must match the server env var.

Server env (Next.js **server**, not the browser bundle): see [Environment variables — Portal architecture routes](../docs/environment-variables.md#portal-architecture-routes-nextjs-server-only).

## Apply from the UI

1. Set on the **Next.js server**:

   - `ARCHITECTURE_ALLOW_APPLY=true` — enables the **Apply & rebuild** button.
   - Optional: `ARCHITECTURE_WRITE_SECRET=<long random>` — paste the same value in **Optional write secret** in the canvas panel.

2. Click **Save to repo** (or rely on **Live save**), then **Apply & rebuild**.

**Warning:** Apply runs Docker against `docker-compose.dev.yml` at the monorepo root. Use only on trusted machines.

## Related documentation

- [Temporal workflows](../docs/temporal-workflows.md) — worker package, task queue, workflow type names.
- [Tenant ID mapping (IAM ↔ WordPress)](../docs/integration/tenant-id-mapping.md)
- [Payouts flow & implementation status](../docs/integration/payouts-flow.md)
- [WordPress plugins — Sovereign OS Core / WooCommerce](../docs/wordpress-plugins.md)

## Apply manually

```powershell
cd <repo-root>
.\generated\architecture\outputs\scripts\apply-wiring.ps1
```

```bash
cd <repo-root>
./generated/architecture/outputs/scripts/apply-wiring.sh
```
