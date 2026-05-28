# Monthly Flow Validation

This checklist defines the manual operational validation plan for the AMENSG monthly process. It is intended for local validation, regression checks, and guided business acceptance before operating a monthly cycle.

## 1. Preparation

- [ ] Confirm `.env` exists and contains the local values required by `.env.example`.
- [ ] Confirm PostgreSQL is running.
- [ ] Run migrations:

  ```bash
  npx prisma migrate deploy
  ```

- [ ] Run seed:

  ```bash
  npm run prisma:seed
  ```

- [ ] Optionally reset the local database when validating a clean monthly flow.
- [ ] Confirm required parameters exist and are active:
  - `precio_unitario_activacion`
  - `porcentaje_iva`
  - `tipo_cambio_usd`
- [ ] Confirm parameter values for the April 2026 validation file:
  - `precio_unitario_activacion = 4.00`
  - `porcentaje_iva = 0.22`
  - `tipo_cambio_usd > 0`
- [ ] Confirm active socios sum exactly 100%.
- [ ] Confirm Socio percentages:
  - Socio 1: `0.1200`
  - Socio 2: `0.4400`
  - Socio 3: `0.4400`

## 2. Import Preview

- [ ] Open `/importaciones/nueva`.
- [ ] Upload the April CSV file.
- [ ] Confirm preview detects:
  - Period: `04/2026`
  - Total rows: `16942`
  - Importable rows: `16942`
  - Facturable rows: `16942`
  - Companies: `3`
  - Lots: `34`
  - States: `7`
  - Completed activations: `16746`
  - Without real activation date: `196`
- [ ] Confirm blocking errors are clearly visible if present.
- [ ] Confirm warnings are summarized by default and the full warning list is not expanded automatically.
- [ ] Expand warning details and confirm they appear in a scrollable area when long.

## 3. Import Confirmation

- [ ] Click confirmation action after a valid preview.
- [ ] Confirm one `ImportacionActivacion` is created.
- [ ] Confirm `16942` `ActivacionImportada` rows are persisted.
- [ ] Confirm `3` `FacturacionMensual` rows are generated.
- [ ] Confirm company billing quantities:
  - VOS: `13492`
  - RELPONT: `2950`
  - Phinternet: `500`
- [ ] Confirm billing amounts:
  - VOS: subtotal `53968.00`, IVA `11872.96`, total `65840.96`
  - RELPONT: subtotal `11800.00`, IVA `2596.00`, total `14396.00`
  - Phinternet: subtotal `2000.00`, IVA `440.00`, total `2440.00`

## 4. Read Screens

- [ ] Open `/importaciones` and confirm the import appears with the correct period, status, row totals, company count, completed activations, rows without real activation date, and confirmation date.
- [ ] Open `/importaciones/[id]` and confirm summary, generated billing rows, company counts, and navigation links are correct.
- [ ] Open `/activaciones` and confirm filters and pagination work for large imported files.
- [ ] Open `/facturacion` and confirm billing rows, amounts, collection status, and links to component activations are readable.

## 5. Cobros

- [ ] Open `/facturacion` or `/cobros`.
- [ ] Change a billing status to `PAGADO`, `CONTADO`, or `CHEQUE` without `fechaCobro`; confirm it is blocked.
- [ ] Change a billing status to `PAGADO`, `CONTADO`, or `CHEQUE` with `fechaCobro`; confirm it is accepted.
- [ ] Change a billing status to `PENDIENTE` or `ENVIADO` without `fechaCobro`; confirm it is accepted.
- [ ] Confirm the cobros summary excludes annulled billing.

## 6. Gastos

- [ ] Open `/gastos`.
- [ ] Create a monthly expense.
- [ ] Edit the expense.
- [ ] Delete the expense while the period is open.
- [ ] Confirm monthly cards update:
  - Total gastos del mes
  - Total gastos fijos
  - Total gastos variables
  - Cantidad de gastos

## 7. Ingresos Adicionales

- [ ] Open `/ingresos-adicionales`.
- [ ] Create a UYU income and confirm:
  - `montoSinIva = montoOrigen`
  - IVA is calculated from `porcentajeIva`
  - `montoConIva = montoSinIva + iva`
- [ ] Create a USD income and confirm:
  - `tipoCambioAplicado` corresponds to `fechaFacturacion`
  - `montoSinIva = montoOrigen * tipoCambioAplicado`
  - IVA is calculated in UYU
  - `montoConIva` is calculated in UYU
- [ ] Confirm the exchange rate snapshot is stored and old records are not recalculated automatically.

## 8. Liquidation Preview

- [ ] Open `/liquidaciones`.
- [ ] Select April 2026.
- [ ] Confirm:
  - `total_ingresos_sin_iva = facturacion totalSinIva + ingresos adicionales montoSinIva`
  - `resultado_distribuible = total_ingresos_sin_iva - total_gastos`
  - Socio distribution uses active socio percentages.
  - `monto_socio_usd = monto_socio_pesos / tipo_cambio_usd`
  - `tipo_cambio_usd` comes from the configured parameter for open periods.
- [ ] Confirm closing is blocked when there is no facturacion.
- [ ] Confirm closing is blocked when active socios do not sum 100%.
- [ ] Confirm closing is blocked when `tipo_cambio_usd` is missing, invalid, or less than or equal to zero.

## 9. Closing

- [ ] Close April 2026 from `/liquidaciones`.
- [ ] Confirm the closure appears in `/cierres`.
- [ ] Open `/cierres/[id]`.
- [ ] Confirm frozen snapshot values are shown:
  - ingresos
  - gastos
  - resultado distribuible
  - tipo de cambio
  - socio percentages
  - socio amounts in pesos and USD
- [ ] Modify a parameter after closing and confirm the closure snapshot does not recalculate automatically.

## 10. Closed-Period Protections

After closing April 2026:

- [ ] Confirm creating gastos for April is blocked.
- [ ] Confirm editing gastos for April is blocked.
- [ ] Confirm deleting gastos for April is blocked.
- [ ] Confirm creating ingresos adicionales for April is blocked.
- [ ] Confirm editing ingresos adicionales for April is blocked.
- [ ] Confirm deleting ingresos adicionales for April is blocked.
- [ ] Confirm changing billing collection status for April is blocked.
- [ ] Confirm confirming a new import for April is blocked.

## 11. Reopening

- [ ] Open `/cierres`.
- [ ] Reopen a closed period with a required `motivo`.
- [ ] Confirm the closure state changes to `REABIERTO`.
- [ ] Confirm the period becomes editable again.
- [ ] Modify a gasto or ingreso adicional.
- [ ] Close the period again.
- [ ] Confirm the closure returns to `CERRADO`.
- [ ] Confirm reopened metadata and historical snapshot remain visible.

## 12. Import Annulment

- [ ] Confirm annulment is available only while the period is open.
- [ ] Annul an import with required `motivo`.
- [ ] Confirm `ImportacionActivacion` remains visible with status `ANULADA`.
- [ ] Confirm `ActivacionImportada` rows are not deleted.
- [ ] Confirm associated `FacturacionMensual` rows are annulled or inactive.
- [ ] Confirm liquidation excludes annulled billing.
- [ ] Confirm cobros pendientes exclude annulled billing.
- [ ] Confirm a new import for the same period is allowed after annulment.

## 13. Regression Checklist

- [ ] Chip values with a leading apostrophe remove only the leading apostrophe.
- [ ] Chip values remain strings and preserve leading zeros.
- [ ] MID and Chip uniqueness remain scoped by `empresaId + anio + mes`.
- [ ] Liquidation and closure screens do not show raw JSON.
- [ ] Warning details are collapsed by default in import preview.
- [ ] `/ingresos-adicionales` has no horizontal overflow on desktop.
- [ ] `/facturacion` remains compact and readable.
- [ ] `/auditoria` shows readable audit rows and expandable details without raw JSON.
- [ ] Closed periods cannot be modified unless reopened.
- [ ] Reopened periods can be closed again.
- [ ] Empty periods or periods without confirmed billing cannot be closed.
