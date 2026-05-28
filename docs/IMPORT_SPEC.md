# IMPORT_SPEC

This phase implements CSV import preview and confirmation.

- User uploads only the CSV file.
- User does not select company, month, or year.
- CSV separator is semicolon (`;`).
- Period is detected only from `Fecha de importación`.
- `Fecha de activación` must not be used to detect the period.
- The file may contain one or many companies.
- The preview validates that the file contains only one month/year.
- The preview detects companies from `Empresa`.
- The preview detects states from `Estado de activación`.
- The preview detects lots from `Lote`.
- Technical activation dates are `01/01/1900` and `01/01/2000`.
- Technical dates do not block and do not discount.
- States different from `OK` do not block and do not discount.
- All structurally valid rows are facturable.
- MID and chip uniqueness is scoped to `empresaId + anio + mes`.
- MID and chip may repeat across different months.
- Chip values are treated as text strings.
- Chip values may include a leading apostrophe from Excel/text formatting.
- The import process trims surrounding whitespace and removes one leading apostrophe from Chip before validation, duplicate detection, and persistence.
- The original CSV row values remain preserved in `rawRowJson` for traceability.
- Preview calculates a SHA-256 hash of the uploaded file.
- Preview must not write `ActivacionImportada` rows to the database.

Confirmation rules:

- The same uploaded CSV is submitted for confirmation.
- Confirmation must re-run preview validation before writing.
- If a CSV company does not exist in `Empresa`, confirmation is blocked with the missing names.
- Confirmation persists one `ImportacionActivacion` per confirmed file/period.
- Confirmation persists all CSV rows as `ActivacionImportada`.
- Confirmation preserves `rawRowJson` and `empresaNombreArchivo` for every row.
- Confirmation associates every row with an existing `Empresa`.
- Confirmation generates one `FacturacionMensual` per company.
- Confirmation uses current `precio_unitario_activacion` and `porcentaje_iva`.
- Confirmation stores `precioUnitario` and `porcentajeIva` snapshots.
- Confirmation sets generated facturaciones to `EstadoCobro=PENDIENTE`.
- Confirmation stores `hashArchivo` and blocks duplicate file confirmation.
- MVP allows one confirmed importation per period.
- Confirmation is transactional and must rollback all writes if any step fails.
- Confirmation writes basic `Auditoria` entries for the import and generated facturaciones.
- Import cancellation is implemented as annulment. Annulled importations remain auditable and are not physically deleted.
- Full company reconciliation UI is not implemented yet.
- Imported activation row editing is not implemented.
