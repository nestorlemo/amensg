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
