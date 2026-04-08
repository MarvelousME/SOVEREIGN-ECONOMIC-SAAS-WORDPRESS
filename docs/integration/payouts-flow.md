# Payouts — how they are supposed to work vs what is implemented

## Intended flow (referral / rewards payouts)

1. **Request** — Client calls **referral-service** to create a payout (amount, method, idempotency key). Rows live in **`payout_requests`** (see `services/referral-service/src/models/payoutModel.ts`).
2. **Processing** — `ReferralController` moves the payout to **processing** and calls **`TreasuryService.processPayout`** (`services/referral-service/src/services/treasuryService.ts`).
3. **NATS** — That client **does not HTTP the treasury-engine directly**. It publishes a **request** on subjects such as:
   - `treasury.payout.bank_transfer`
   - `treasury.payout.crypto`
   - `treasury.payout.platform_credit`
   - fallback `treasury.payout`
4. **Settlement** — A **subscriber** on the treasury side is expected to debit the vault / ledger and reply with `{ success, treasuryTransactionId }`. Status checks use `treasury.payout.status`; destination validation uses `treasury.destination.validate`.
5. **Completion** — Referral-service updates **`payout_requests`**, writes **audit** rows, and notifies the user.

Parallel **Temporal** scaffolding exists in **`workflows/src/workflows/payout.workflow.ts`**: validate → limits → lock funds → `POST ${ledgerService}/api/payouts/process` → ledger update → notification. That HTTP path is a **second, workflow-specific** integration point.

---

## Implementation status (this repo)

| Piece | Status |
|-------|--------|
| Referral-service payout **models**, **controller**, **tests** | Implemented (`services/referral-service`) |
| NATS client + **subject selection** in `TreasuryService` | Implemented |
| **Treasury-engine** (or other service) **subscribing** to `treasury.payout.*` and replying | **Not found** in `services/treasury-engine` — **gap**; payouts will **fail or time out** unless another worker implements these subjects |
| **Ledger-service** `POST /api/payouts/process` | **Not found** under `services/ledger-service` — **gap** relative to the Temporal activity in `workflows/src/activities/payout.activities.ts` |
| **Main API** (`api/`) route for `/api/payouts` | **Not found** — **gap** |
| WordPress **`[sovereign_wallet_balance]`** | Calls **`/api/payouts`** on configured API base (`sovereign-os-core.php`) — will **not** work until the API exposes that route (or the shortcode is pointed at a real wallet/balance endpoint) |

So: **referral payout orchestration is largely coded**, but **end-to-end payout execution is incomplete** without NATS handlers and/or ledger HTTP + portal/API alignment.

---

## Relation to tenants

- Referral payout records use **string `userId`** in the TypeScript layer (often UUID-shaped ids from your auth layer), not necessarily IAM `users.id` bigint.
- **Treasury vaults** remain keyed by **`tenants.id` (bigint)**; workspace UUID mapping is documented in [tenant-id-mapping.md](./tenant-id-mapping.md).

---

## Next steps (engineering)

1. Implement **NATS subscribers** for `treasury.payout.*` (and optional `treasury.destination.validate`) in **treasury-engine** or a dedicated payout worker, calling **ledger-service** / DB atomically.
2. **Or** implement **`POST /api/payouts/process`** on **ledger-service** and wire Temporal activities to a deployed URL.
3. Replace or repoint WordPress **`sovereign_wallet_balance`** to a real balance endpoint (e.g. ledger or treasury API) once it exists.
