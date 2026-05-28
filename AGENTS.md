# AMENSG Agent Instructions

## Scope
Repository-wide.

## Mission for this phase
Set up project foundation only:
- Documentation
- Local execution setup
- Data model scaffold
- UI skeleton

Do **not** implement business logic, authentication flow, or CSV import processing yet.

## Validation
Use Windows-friendly commands when PowerShell blocks npm or npx scripts:
- `npm.cmd install`
- `npx.cmd prisma generate`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

Codex must always run validation before finishing a task:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test` when tests exist

If PowerShell blocks script execution, use the `.cmd` equivalents.

## Data rules that must not change
- PostgreSQL only.
- UUID ids.
- Decimal for money; never Float for money.
- MID and chip are unique by `empresaId + anio + mes`, not globally unique.
- Imported rows preserve `rawRowJson` and `empresaNombreArchivo`.
- Billing and closure records preserve snapshots.
- Importations are not physically deleted.
- Do not change business rules unless explicitly instructed.
- Do not change import, billing, or liquidation formulas unless explicitly instructed.

## Prisma and migrations
- Any change to `prisma/schema.prisma` must include a Prisma migration in `prisma/migrations/`.
- Report migrations clearly in the task summary, including migration folder names and purpose.
