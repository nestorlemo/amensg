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
- `Parametro.tipo` stores the parameter value type.
- `Parametro.activo` marks whether the parameter is active without deleting it.
- `CierreMensual.snapshot` stores the monthly close snapshot.
- `CierreSocio.snapshot` stores the partner close snapshot.
- `CierreMensual.estado` stores the close status.
- `CierreMensual.cerradoAt` stores the close timestamp.
- A period is considered closed for mutation guards when a `CierreMensual` exists for the same `anio + mes` with `estado = CERRADO`.
- `Socio.porcentajeParticipacion` stores the active partner distribution percentage.
- `Socio.cuentas` stores optional account metadata to freeze in closing snapshots.

## Expenses and Additional Income Fields

- `GastoConcepto.tipo` classifies concepts as `FIJO` or `VARIABLE`.
- `GastoMensual.fecha` stores the expense date.
- `GastoMensual.importe` stores the expense amount.
- `GastoMensual.observaciones` stores optional notes.
- `IngresoAdicional.concepto` stores the income concept.
- `IngresoAdicional.empresaId` optionally associates income with an `Empresa`.
- `IngresoAdicional.moneda` stores the origin currency: `UYU` or `USD`.
- `IngresoAdicional.montoOrigen` stores the original amount in `moneda`.
- `IngresoAdicional.fechaFacturacion` stores the invoice date used to select the applicable exchange rate.
- `IngresoAdicional.tipoCambioAplicado`, `fuenteTipoCambio`, and `fechaTipoCambio` store the exchange-rate snapshot when the origin currency is USD.
- `IngresoAdicional.montoSinIva`, `iva`, and `montoConIva` store Decimal monetary values.
- `IngresoAdicional.porcentajeIva` stores the IVA rate snapshot used for the calculation.
- `IngresoAdicional.observaciones` stores optional notes.

## Importation Lifecycle

`ImportacionActivacion` rows represent import events and must remain auditable. If a future workflow cancels an importation, it must mark lifecycle fields such as `estado` and `anuladaEn` instead of deleting the row.
