# API_SPEC

The foundation includes a basic health endpoint:

- `GET /api/health`

Expected response:

```json
{
  "status": "ok",
  "service": "amensg"
}
```

Future API work must preserve the business rules documented in `BUSINESS_RULES.md` and the persistence rules documented in `DATA_MODEL.md`.

## Import Preview

- `POST /api/importaciones/preview`
- Request: `multipart/form-data` with a CSV file in field `file`.
- CSV separator: semicolon (`;`).
- This endpoint returns a preview only. It must not persist `ActivacionImportada` rows, confirm an import, generate monthly billing, or cancel importations.

Response shape:

```json
{
  "file": {
    "name": "activaciones.csv",
    "size": 1234,
    "hash": "sha256"
  },
  "detectedPeriod": {
    "anio": 2026,
    "mes": 5
  },
  "totalRows": 10,
  "importableRows": 10,
  "facturableRows": 10,
  "detectedCompaniesCount": 2,
  "detectedLotsCount": 3,
  "detectedStatesCount": 2,
  "completedActivationsCount": 8,
  "activationsWithoutRealActivationDateCount": 2,
  "validation": {
    "hasBlockingErrors": false,
    "errors": [],
    "warnings": []
  },
  "companySummary": [],
  "stateSummary": [],
  "lotSummary": [],
  "economicPreview": {
    "precioUnitarioActivacion": "0.00",
    "porcentajeIva": "22.00",
    "totalSinIva": "0.00",
    "iva": "0.00",
    "totalConIva": "0.00"
  }
}
```

## Import Confirmation

- `POST /api/importaciones/confirmar`
- `POST /api/importaciones/:id/anular`
- Request: `multipart/form-data` with a CSV file in field `file`.
- The endpoint re-runs preview validation before writing.
- If a company from the CSV does not exist in `Empresa`, the endpoint returns `409` with `missingCompanies`.
- The endpoint blocks duplicate file confirmation by `hashArchivo`.
- The endpoint blocks a second active/confirmed importation for the same period in the MVP.
- The endpoint allows a new importation for the same period when previous importations for that period are `ANULADA`.
- The endpoint blocks confirmation when the detected period already has `CierreMensual.estado = CERRADO` and returns `PERIODO_CERRADO`.
- The endpoint persists `ImportacionActivacion`, all `ActivacionImportada` rows, one `FacturacionMensual` per company, and basic `Auditoria` entries in one transaction.

Success response shape:

```json
{
  "importacionId": "uuid",
  "facturaciones": [
    {
      "id": "uuid",
      "empresaId": "uuid",
      "empresaNombreArchivo": "Empresa CSV",
      "anio": 2026,
      "mes": 4,
      "cantidadActivaciones": 100,
      "subtotal": "1000.00",
      "iva": "220.00",
      "total": "1220.00"
    }
  ]
}
```

Annul request:

```json
{
  "motivo": "Archivo confirmado por error"
}
```

Annulment requires `motivo`. If the importation does not exist, the endpoint returns `NOT_FOUND`. If it is already `ANULADA`, it returns a validation error. If the period is closed, it returns `PERIODO_CERRADO`. Annulment sets `ImportacionActivacion.estado = ANULADA`, stores the annulment timestamp and reason, marks associated `FacturacionMensual` rows with `EstadoCobro = ANULADO`, and writes an `Auditoria` entry. It does not delete imported activation rows or billing rows.

## Billing Collection Status

- `POST /api/facturacion/:id/cambiar-estado-cobro`
- Updates only `estadoCobro`, `fechaCobro`, and `observaciones`.
- Writes an `Auditoria` entry for every status change.
- Does not delete `FacturacionMensual` records.
- Blocks changes when the billing period already has `CierreMensual.estado = CERRADO` and returns `PERIODO_CERRADO`.
- `PAGADO`, `CONTADO`, and `CHEQUE` require `fechaCobro`.
- `PENDIENTE`, `ENVIADO`, and `ANULADO` allow `fechaCobro` to be null.

Request:

```json
{
  "estadoCobroId": "uuid",
  "fechaCobro": "2026-05-26",
  "observaciones": "optional"
}
```

Read endpoints:

- `GET /api/cobros`
- `GET /api/cobros/resumen`

## Expenses

- `GET /api/gastos/conceptos`
- `POST /api/gastos/conceptos`
- `PUT /api/gastos/conceptos/:id`
- `POST /api/gastos/conceptos/:id/desactivar`
- `GET /api/gastos`
- `POST /api/gastos`
- `PUT /api/gastos/:id`
- `DELETE /api/gastos/:id`

Expense fields:

```json
{
  "conceptoId": "uuid",
  "anio": 2026,
  "mes": 5,
  "fecha": "2026-05-27",
  "importe": "100.00",
  "observaciones": "optional"
}
```

Expense changes are blocked when `CierreMensual.estado = CERRADO` already exists for the same `anio + mes`.

## Additional Income

- `GET /api/ingresos-adicionales`
- `POST /api/ingresos-adicionales`
- `PUT /api/ingresos-adicionales/:id`
- `DELETE /api/ingresos-adicionales/:id`

Additional income fields:

```json
{
  "concepto": "Ajuste comercial",
  "empresaId": "uuid optional",
  "anio": 2026,
  "mes": 5,
  "moneda": "USD",
  "montoOrigen": "100.00",
  "fechaFacturacion": "2026-05-10",
  "tipoCambioAplicado": "40.00",
  "fuenteTipoCambio": "PARAMETRO",
  "fechaTipoCambio": "2026-05-10",
  "porcentajeIva": "0.22",
  "observaciones": "optional"
}
```

`moneda` accepts `UYU` or `USD`. The API always stores `montoSinIva`, `iva`, and `montoConIva` in UYU with Decimal-safe calculations. If `moneda = USD`, `tipoCambioAplicado` is required, must be greater than 0, and must correspond to `fechaFacturacion`. The applied exchange rate is stored as a historical snapshot and old records are not recalculated automatically if rates change later.

Additional income changes are blocked when `CierreMensual.estado = CERRADO` already exists for the same `anio + mes` and return `PERIODO_CERRADO`.

Exchange rate lookup:

- `GET /api/tipo-cambio/usd?fecha=YYYY-MM-DD`

The `fecha` parameter is the additional income `fechaFacturacion`. Banco Central del Uruguay is the preferred official source. Until real BCU integration is implemented, the endpoint returns the current `Parametro.tipo_cambio_usd` with `fuente = "PARAMETRO"` so local development does not require internet access.

## Parameters

- `GET /api/parametros`
- `PUT /api/parametros/:id`

Parameter fields:

```json
{
  "clave": "tipo_cambio_usd",
  "valor": "40.00",
  "tipo": "DECIMAL",
  "descripcion": "Tipo de cambio USD",
  "activo": true
}
```

Required parameters are `precio_unitario_activacion`, `porcentaje_iva`, and `tipo_cambio_usd`. Updates validate current business bounds and write an `Auditoria` entry. Updates apply to future calculations only and do not recalculate historical billing or closure snapshots.

## Partners

- `GET /api/socios`
- `POST /api/socios`
- `PUT /api/socios/:id`
- `POST /api/socios/:id/desactivar`
- `GET /api/socios/validar-porcentajes`

Socio fields:

```json
{
  "nombre": "Socio 1",
  "porcentajeParticipacion": "12",
  "cuentaPesos": "optional",
  "cuentaUsd": "optional",
  "activo": true
}
```

The API accepts percentages as human percentages such as `12` or decimals such as `0.1200`, and stores `porcentajeParticipacion` as decimal. Active socios must sum 100% for liquidation closure. Create, edit, and deactivate actions write `Auditoria` entries. Deactivation does not delete historical `CierreSocio` snapshots.

## Liquidation Preview and Closing

- `GET /api/liquidaciones/preview?anio=2026&mes=4`
- `POST /api/liquidaciones/cerrar`
- `GET /api/cierres`
- `GET /api/cierres/:id`
- `POST /api/cierres/:id/reabrir`

Close request:

```json
{
  "anio": 2026,
  "mes": 4,
  "confirmacion": true
}
```

Preview response includes:

- `anio`
- `mes`
- `ingresos`
- `gastos`
- `resultado`
- `socios`
- `validaciones`
- `puedeCerrar`

Closing creates `CierreMensual`, `CierreSocio` rows, and an `Auditoria` entry. If the period has an existing `REABIERTO` closure, closing updates that same closure back to `CERRADO`, refreshes the snapshot and related `CierreSocio` rows, and writes a re-closing audit entry. Closure detail responses read frozen snapshot values, not recalculated current data.

The preview and close endpoint block periods without confirmed monthly billing/facturation. The period must have at least one `FacturacionMensual` linked to an active/confirmed, non-annulled `ImportacionActivacion`, and the billing row must not have collection status `ANULADO`. Empty periods, periods with only expenses/additional income, and periods with only annulled importations cannot be closed in the MVP.

Reopen request:

```json
{
  "motivo": "Corrección de gastos del período"
}
```

Reopening requires `motivo`. If the closure is `CERRADO`, the endpoint updates it to `REABIERTO`, stores `reabiertoAt` and `motivoReapertura`, and writes an `Auditoria` entry. If the closure does not exist, it returns `NOT_FOUND`. If it is already `REABIERTO`, it returns a validation error. Reopening does not delete the historical snapshot. A `REABIERTO` period is editable and can be closed again.

## Audit

- `GET /api/auditoria`

Query params:

- `fechaDesde`
- `fechaHasta`
- `entidad`
- `accion`
- `usuario`
- `q`
- `limit`

The response returns newest audit records first with id, timestamp, user, action, entity, entity id, summary, and readable detail key/value rows. Stored JSON metadata is transformed into readable fields for the UI instead of raw JSON blocks.

## Authentication and Users

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/usuarios`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`
- `POST /api/usuarios/:id/desactivar`

Local MVP authentication uses a signed session cookie. The seed creates an active `ADMIN` user from environment variables `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.

Protected routes require a valid session. Admin-only APIs return `403 FORBIDDEN` with a clear message when the current user does not have permission. Passwords are stored as hashes and are never returned in API responses.
