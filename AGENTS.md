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

## Data rules that must not change
- PostgreSQL only.
- UUID ids.
- Decimal for money; never Float for money.
- MID and chip are unique by `empresaId + anio + mes`, not globally unique.
- Imported rows preserve `rawRowJson` and `empresaNombreArchivo`.
- Billing and closure records preserve snapshots.
- Importations are not physically deleted.
