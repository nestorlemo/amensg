-- AlterTable
ALTER TABLE "IngresoAdicional"
ADD COLUMN "moneda" TEXT NOT NULL DEFAULT 'UYU',
ADD COLUMN "montoOrigen" DECIMAL(18,2),
ADD COLUMN "fechaFacturacion" TIMESTAMP(3),
ADD COLUMN "tipoCambioAplicado" DECIMAL(18,6),
ADD COLUMN "fuenteTipoCambio" TEXT,
ADD COLUMN "fechaTipoCambio" TIMESTAMP(3);

-- Backfill existing income rows as UYU records preserving stored UYU totals.
UPDATE "IngresoAdicional"
SET
  "montoOrigen" = "montoSinIva",
  "fechaFacturacion" = "creadoEn",
  "tipoCambioAplicado" = 1,
  "fuenteTipoCambio" = 'PARAMETRO',
  "fechaTipoCambio" = "creadoEn"
WHERE "montoOrigen" IS NULL
   OR "fechaFacturacion" IS NULL;

-- AlterTable
ALTER TABLE "IngresoAdicional"
ALTER COLUMN "montoOrigen" SET NOT NULL,
ALTER COLUMN "fechaFacturacion" SET NOT NULL;
