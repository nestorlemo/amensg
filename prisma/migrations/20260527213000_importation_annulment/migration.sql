ALTER TABLE "ImportacionActivacion"
ADD COLUMN "motivoAnulacion" TEXT;

ALTER TABLE "ImportacionActivacion"
DROP CONSTRAINT IF EXISTS "ImportacionActivacion_anio_mes_key";

ALTER TABLE "FacturacionMensual"
DROP CONSTRAINT IF EXISTS "FacturacionMensual_empresaId_anio_mes_key";

ALTER TABLE "ActivacionImportada"
DROP CONSTRAINT IF EXISTS "ActivacionImportada_empresaId_anio_mes_mid_key";

ALTER TABLE "ActivacionImportada"
DROP CONSTRAINT IF EXISTS "ActivacionImportada_empresaId_anio_mes_chip_key";

CREATE INDEX IF NOT EXISTS "ImportacionActivacion_anio_mes_idx"
ON "ImportacionActivacion"("anio", "mes");

CREATE UNIQUE INDEX IF NOT EXISTS "ImportacionActivacion_anio_mes_activa_key"
ON "ImportacionActivacion"("anio", "mes")
WHERE "estado" <> 'ANULADA';

CREATE INDEX IF NOT EXISTS "FacturacionMensual_empresaId_anio_mes_idx"
ON "FacturacionMensual"("empresaId", "anio", "mes");

CREATE INDEX IF NOT EXISTS "ActivacionImportada_empresaId_anio_mes_mid_idx"
ON "ActivacionImportada"("empresaId", "anio", "mes", "mid");

CREATE INDEX IF NOT EXISTS "ActivacionImportada_empresaId_anio_mes_chip_idx"
ON "ActivacionImportada"("empresaId", "anio", "mes", "chip");
