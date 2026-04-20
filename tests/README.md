# Automated Tests
codex resume 019d3e7c-2d98-7360-b4a4-80c52350f388

This repo now includes:

- `Vitest` for unit and business-logic tests in `tests/unit`
- `Playwright` for end-to-end financial workflow tests in `tests/e2e`

## Run

```bash
npm run test:unit
npm run test:e2e
npm test
```

Install the Playwright browser once on a new machine:

```bash
npm run test:e2e:install
```

## Required E2E environment

Playwright signs in through the real login form, so set:

```bash
E2E_ADMIN_EMAIL=admin@example.com
E2E_ADMIN_PASSWORD=your-password
```

Optional:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
```

If `PLAYWRIGHT_BASE_URL` is not set, Playwright starts the local Next.js dev server automatically.

## Coverage focus

Unit tests cover:

- sales remaining and status transitions
- purchase payable calculation
- supplier pending totals
- supplier payment oldest-first allocation
- salary advance / remaining / carry-forward snapshots
- dashboard totals helpers

E2E tests cover:

- sales creation and settlement
- supplier bills and supplier-level payments
- staff salary transactions and recorded transaction view
- dashboard summary updates
- invalid payment safeguards

## Stable fixtures

Shared deterministic money fixtures live in:

- `tests/fixtures/financial.ts`

Those fixtures are used by the unit suite so the expected balances stay fixed across runs.
