-- DropForeignKey
ALTER TABLE "ImportacionActivacion" DROP CONSTRAINT IF EXISTS "ImportacionActivacion_empresaId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "ImportacionActivacion_empresaId_anio_mes_idx";

-- AlterTable
ALTER TABLE "ImportacionActivacion" DROP COLUMN IF EXISTS "empresaId";
ALTER TABLE "ImportacionActivacion" ADD COLUMN "hashArchivo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ActivacionImportada" ADD COLUMN "estadoActivacion" TEXT NOT NULL;
ALTER TABLE "ActivacionImportada" ADD COLUMN "lote" TEXT NOT NULL;
ALTER TABLE "ActivacionImportada" ADD COLUMN "fechaImportacion" TIMESTAMP(3) NOT NULL;
ALTER TABLE "ActivacionImportada" ADD COLUMN "fechaActivacion" TIMESTAMP(3);
ALTER TABLE "ActivacionImportada" ADD COLUMN "tieneFechaRealActivacion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FacturacionMensual" ADD COLUMN "importacionId" UUID NOT NULL;
ALTER TABLE "FacturacionMensual" ADD COLUMN "estadoCobroId" UUID NOT NULL;
ALTER TABLE "FacturacionMensual" ADD COLUMN "cantidadActivaciones" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ImportacionActivacion_hashArchivo_key" ON "ImportacionActivacion"("hashArchivo");

-- CreateIndex
CREATE UNIQUE INDEX "ImportacionActivacion_anio_mes_key" ON "ImportacionActivacion"("anio", "mes");

-- CreateIndex
CREATE INDEX "FacturacionMensual_importacionId_idx" ON "FacturacionMensual"("importacionId");

-- CreateIndex
CREATE INDEX "FacturacionMensual_estadoCobroId_idx" ON "FacturacionMensual"("estadoCobroId");

-- AddForeignKey
ALTER TABLE "FacturacionMensual" ADD CONSTRAINT "FacturacionMensual_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "ImportacionActivacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturacionMensual" ADD CONSTRAINT "FacturacionMensual_estadoCobroId_fkey" FOREIGN KEY ("estadoCobroId") REFERENCES "EstadoCobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
