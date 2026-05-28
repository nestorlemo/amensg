# Codex Web Workflow

This document defines the standard collaboration flow between Codex Web and local development for AMENSG.

## 1) How to request tasks in Codex Web

- Be explicit about scope: indicate exact files/modules when possible.
- State constraints clearly (for example: "do not change business rules", "no new features").
- Ask Codex Web to run required validation commands before finishing:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm run test` (when tests exist)
- If `prisma/schema.prisma` changes are requested, require:
  - a migration under `prisma/migrations/`
  - a clear migration summary in the report

## 2) How to review Codex Web changes

Before merging:

1. Review changed files for scope compliance (no unintended business logic changes).
2. Confirm monetary fields remain `Decimal` (never `Float`).
3. Confirm import/billing/liquidation formulas were not changed unless requested.
4. If `prisma/schema.prisma` changed, verify a matching migration was included.
5. Validate command output for typecheck/lint/build (and tests if present).

## 3) How to pull changes locally

```bash
git pull
npm install
```

On Windows PowerShell, use:

```powershell
npm.cmd install
```

## 4) How to run migrations locally

Ensure PostgreSQL is running and `.env` is configured, then:

```bash
npm run prisma:deploy
npm run prisma:generate
```

If local schema work is in progress and a new migration must be created:

```bash
npm run prisma:migrate
```

## 5) How to run the app locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 6) How to test the monthly flow after changes

Use the checklist in `docs/MONTHLY_FLOW_VALIDATION.md` as the regression baseline:

1. Prepare environment, migrations, and seed.
2. Validate import preview and confirmation.
3. Validate billing/cobros, expenses, additional income, liquidation, close/reopen, and import annulment.
4. Execute the regression checklist section before accepting changes.
