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
- Request: `multipart/form-data` with a CSV file in field `file`.
- The endpoint re-runs preview validation before writing.
- If a company from the CSV does not exist in `Empresa`, the endpoint returns `409` with `missingCompanies`.
- The endpoint blocks duplicate file confirmation by `hashArchivo`.
- The endpoint blocks a second confirmed importation for the same period in the MVP.
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

## Liquidation Preview and Closing

- `GET /api/liquidaciones/preview?anio=2026&mes=4`
- `POST /api/liquidaciones/cerrar`
- `GET /api/cierres`
- `GET /api/cierres/:id`

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

Closing creates `CierreMensual`, `CierreSocio` rows, and an `Auditoria` entry. Closure detail responses read frozen snapshot values, not recalculated current data.
