# IMPORT_SPEC

CSV import confirmation and persistence are intentionally not implemented in this phase.

This phase implements only CSV import preview:

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
- Preview calculates a SHA-256 hash of the uploaded file.
- Preview must not write `ActivacionImportada` rows to the database.

Future confirmation may store imported files under `storage/importaciones/` when using the local storage driver. Future persistence must store imported activation rows one row per `ActivacionImportada`, preserve `rawRowJson`, preserve `empresaNombreArchivo`, and avoid physical deletion of importation records.
