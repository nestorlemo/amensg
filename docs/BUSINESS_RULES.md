# BUSINESS_RULES

## Phase Boundary

- Do not implement CSV import logic in this phase.
- Do not implement full authentication in this phase.
- Do not implement business workflows in this phase.
- Do not change the requested business rules.

## CSV Preview Boundary

- Implement preview only.
- Do not implement import confirmation yet.
- Do not persist imported activation rows yet.
- Do not generate `FacturacionMensual` yet.
- Do not implement import cancellation yet.
- The user only uploads the CSV.
- The user does not select company, month, or year.
- The period is detected only from `Fecha de importación`.
- Do not use `Fecha de activación` to detect the period.
- The file may contain one or many companies.
- All structurally valid rows are facturable.
- States different from `OK` do not block and do not discount.
- Dates `01/01/1900` and `01/01/2000` do not block and do not discount.
- MID and chip duplicates are checked by Empresa + año + mes.
- MID and chip may repeat across different months.

## Data Integrity Rules

- PostgreSQL is the database.
- UUID ids are required.
- Monetary values use Decimal.
- Float must not be used for money.
- MID must not be globally unique.
- Chip must not be globally unique.
- MID must be unique by `empresaId + anio + mes`.
- Chip must be unique by `empresaId + anio + mes`.
- CSV details must be stored row by row.
- `ActivacionImportada.rawRowJson` must preserve the raw imported row.
- `ActivacionImportada.empresaNombreArchivo` must preserve the company name from the imported file.
- `FacturacionMensual.precioUnitario` must preserve the price snapshot for the period.
- `FacturacionMensual.porcentajeIva` must preserve the IVA snapshot for the period.
- `CierreMensual` and `CierreSocio` must store snapshots.
- Importations must not be physically deleted.

## Seed Rules

The foundation seed must create:

- One initial admin user from environment variables.
- Estados de cobro: `PENDIENTE`, `ENVIADO`, `PAGADO`, `CONTADO`, `CHEQUE`, `ANULADO`.
- Parametros: `precio_unitario_activacion`, `porcentaje_iva`, `tipo_cambio_usd`.
- Gasto conceptos: `Estudio contable`, `IRAE`, `AWS`, `Compra de captchas`, `Certificado AMENSG`, `Facturación electrónica`, `Otros`.
