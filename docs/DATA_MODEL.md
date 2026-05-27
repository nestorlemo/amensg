# DATA_MODEL

## Global Rules

- Database provider: PostgreSQL.
- Every model uses UUID ids.
- Monetary values must use Prisma `Decimal`.
- Do not use `Float` for money.
- MID is not globally unique.
- Chip is not globally unique.
- MID is unique by `empresaId + anio + mes`.
- Chip is unique by `empresaId + anio + mes`.
- Imported CSV details must be stored row by row.
- Importations must not be physically deleted.
- Monthly closures must store snapshots.

## Required Models

- `Usuario`
- `Empresa`
- `Socio`
- `Parametro`
- `EstadoCobro`
- `ImportacionActivacion`
- `ActivacionImportada`
- `FacturacionMensual`
- `GastoConcepto`
- `GastoMensual`
- `IngresoAdicional`
- `CierreMensual`
- `CierreSocio`
- `Auditoria`

## Required Snapshot Fields

- `ActivacionImportada.rawRowJson` stores the raw imported CSV row.
- `ActivacionImportada.empresaNombreArchivo` stores the company name as it appeared in the imported file.
- `FacturacionMensual.precioUnitario` stores the unit price snapshot used for that billing period.
- `FacturacionMensual.porcentajeIva` stores the IVA percentage snapshot used for that billing period.
- `ImportacionActivacion.hashArchivo` stores the confirmed file hash and prevents duplicate confirmation.
- `FacturacionMensual.estadoCobro` starts as `PENDIENTE`.
- `FacturacionMensual.fechaCobro` stores the collection date when the billing is paid by cash, check, or payment.
- `FacturacionMensual.observaciones` stores optional collection notes.
- `CierreMensual.snapshot` stores the monthly close snapshot.
- `CierreSocio.snapshot` stores the partner close snapshot.

## Importation Lifecycle

`ImportacionActivacion` rows represent import events and must remain auditable. If a future workflow cancels an importation, it must mark lifecycle fields such as `estado` and `anuladaEn` instead of deleting the row.
