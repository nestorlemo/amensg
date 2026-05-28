# BUSINESS_RULES

## Phase Boundary

- Do not implement full authentication in this phase.
- Import cancellation is implemented as annulment, not physical deletion.
- Do not implement full company reconciliation UI yet.
- Do not allow editing imported activation rows.
- Do not change the requested business rules.

## CSV Import Rules

- Implement preview and confirmation.
- The user only uploads the CSV.
- The user does not select company, month, or year.
- The period is detected only from `Fecha de importación`.
- Do not use `Fecha de activación` to detect the period.
- The file may contain one or many companies.
- All structurally valid rows are facturable.
- States different from `OK` do not block and do not discount.
- Dates `01/01/1900` and `01/01/2000` do not block and do not discount.
- Dates `01/01/1900` and `01/01/2000` are stored as no real activation date.
- MID and chip duplicates are checked by Empresa + año + mes.
- MID and chip may repeat across different months.
- Chip is treated as text and must not be converted to a number.
- A leading apostrophe in Chip from Excel/text formatting is removed before validation and persistence.
- Chip leading zeros must be preserved.
- Confirmation must be transactional.
- Confirmation must rollback all writes if any step fails.
- Confirmation blocks if a company from the CSV does not exist in `Empresa`.
- Confirmation generates one `FacturacionMensual` per company.
- Generated facturaciones start with `EstadoCobro=PENDIENTE`.
- Duplicate file confirmation is blocked by `hashArchivo`.
- MVP allows one active/confirmed importation per period.
- If an importation is annulled, a new importation for the same period is allowed while the period remains open.
- Annulled importations remain auditable but do not participate in operational reports, active billing, collections, or liquidation.

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
- Annulment must not delete imported activation rows or generated billing rows.

## Audit and Traceability Rules

- Critical operations must write `Auditoria` entries.
- Audited operations include parameter edits, socio create/edit/deactivate, import confirmation, import annulment, billing collection status changes, expense create/edit/delete, additional income create/edit/delete, monthly close, and closure reopening.
- Parameter edits must include old and new values.
- Import annulment and closure reopening must include the mandatory reason.
- Audit records are historical and must not be edited from the UI.
- Business users must see readable audit summaries and details, not raw JSON dumps.

## Parameters and Partners Rules

- Required parameters are `precio_unitario_activacion`, `porcentaje_iva`, and `tipo_cambio_usd`.
- Parameter changes apply only to future calculations, imports, and closures.
- Parameter changes must not modify historical billing records or closed snapshots.
- Parameters must not be physically deleted.
- `tipo_cambio_usd` must be greater than 0.
- `precio_unitario_activacion` must be greater than or equal to 0.
- `porcentaje_iva` must be greater than or equal to 0.
- Parameter changes must write an `Auditoria` entry.
- `Socio.porcentajeParticipacion` is stored as a decimal value where 12% is `0.1200`.
- Only active socios participate in liquidations.
- Active socios must sum 100%; liquidation closure must not proceed if active socios do not sum 100%.
- Deactivating a socio must not delete historical `CierreSocio` snapshots.
- Socio create, edit, and deactivate actions must write an `Auditoria` entry.

## Collection Status Rules

- `FacturacionMensual` records must not be physically deleted when collection status changes.
- Every collection status change must write an `Auditoria` entry.
- `PAGADO`, `CONTADO`, and `CHEQUE` require `fechaCobro`.
- `PENDIENTE` and `ENVIADO` may have `fechaCobro` as null.
- `ANULADO` billings are not considered active for collection summaries.
- Billing rows associated with annulled importations are marked with collection state `ANULADO`.
- Collection status management must not alter imported activations, CSV parsing, import confirmation, or billing amount calculations.

## Expenses and Additional Income Rules

- Expenses reduce the monthly distributable result in future liquidation workflows.
- Additional income increases monthly income in future liquidation workflows.
- Expense and additional income monetary values must use Decimal-safe calculations.
- Additional income IVA is calculated as `montoSinIva * porcentajeIva`.
- Additional income `montoConIva` is calculated as `montoSinIva + iva`.
- Expense concepts can be created, edited, and deactivated.
- Monthly expenses and additional income can be created, edited, and deleted while the period is open.
- A period is considered closed when a `CierreMensual` exists for the same `anio + mes` with `estado = CERRADO`; in that case expense and additional income changes are blocked.
- Every create, edit, delete, or deactivate action for expenses, expense concepts, and additional income must write an `Auditoria` entry.
- Expense and additional income management must not alter CSV preview, import confirmation, MID/chip rules, or billing amount calculations.
- Liquidation closure is not implemented in this phase.

## Monthly Liquidation and Closing Rules

- Monthly liquidation preview is based on billed amounts, not collected payments.
- `total_ingresos_sin_iva` is active monthly billing `totalSinIva` plus additional income `montoSinIva`.
- Additional income may be entered in UYU or USD.
- Additional income stored totals `montoSinIva`, `iva`, and `montoConIva` are always UYU.
- If additional income is entered in UYU, `montoSinIva = montoOrigen`.
- If additional income is entered in USD, `tipoCambioAplicado` is required, must be greater than 0, and must correspond to `fechaFacturacion`; `montoSinIva = montoOrigen * tipoCambioAplicado`.
- Additional income IVA is `montoSinIva * porcentajeIva`, and `montoConIva = montoSinIva + iva`.
- `tipoCambioAplicado` is stored as a snapshot and historical additional income records must not be recalculated automatically if exchange rates change later.
- Banco Central del Uruguay is the preferred official exchange-rate source, with manual or parameter fallback when needed.
- `resultado_distribuible` is `total_ingresos_sin_iva - total_gastos`.
- Partner distribution uses active partner percentages.
- `monto_socio_pesos` is `resultado_distribuible * porcentaje_socio`.
- `monto_socio_usd` is `monto_socio_pesos / tipo_cambio_usd`.
- Active partner percentages must sum 100%.
- `tipo_cambio_usd` must exist and be greater than 0.
- A period cannot be closed unless it has confirmed monthly billing/facturation.
- Empty periods cannot be closed in the MVP.
- Periods with expenses or additional income but no confirmed monthly billing/facturation cannot be closed in the MVP.
- A month can have only one `CierreMensual` row in the MVP, but a `REABIERTO` closure can be closed again by updating that same row with a refreshed snapshot.
- Monthly closures must create immutable `CierreMensual` and `CierreSocio` snapshots.
- Closed monthly closures must not be recalculated automatically.
- Once a monthly period is closed with `CierreMensual.estado = CERRADO`, data that affects that period result must not be modified unless the period is reopened.
- Closed periods block import confirmation, billing collection status changes, monthly expense changes, and additional income changes.
- A closed monthly closure can be reopened only with a mandatory reason.
- Reopening changes `CierreMensual.estado` to `REABIERTO`, stores reopening metadata, and writes an `Auditoria` entry.
- Reopened periods become editable again because only `estado = CERRADO` blocks period mutations.
- Reopened periods may be closed again if all liquidation validations pass.
- Reopening must not delete historical closure snapshots or automatically recalculate them.
- Payment-based liquidation is not implemented in this phase.

## Seed Rules

The foundation seed must create:

- One initial admin user from environment variables.
- Estados de cobro: `PENDIENTE`, `ENVIADO`, `PAGADO`, `CONTADO`, `CHEQUE`, `ANULADO`.
- Parametros: `precio_unitario_activacion`, `porcentaje_iva`, `tipo_cambio_usd`.
- Gasto conceptos: `Estudio contable`, `IRAE`, `AWS`, `Compra de captchas`, `Certificado AMENSG`, `Facturación electrónica`, `Otros`.
