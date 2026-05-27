ALTER TABLE "GastoConcepto" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'VARIABLE';

ALTER TABLE "GastoMensual" RENAME COLUMN "monto" TO "importe";
ALTER TABLE "GastoMensual" ADD COLUMN "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "GastoMensual" ADD COLUMN "observaciones" TEXT;
CREATE INDEX "GastoMensual_conceptoId_idx" ON "GastoMensual"("conceptoId");
CREATE INDEX "GastoMensual_anio_mes_idx" ON "GastoMensual"("anio", "mes");

ALTER TABLE "IngresoAdicional" RENAME COLUMN "descripcion" TO "concepto";
ALTER TABLE "IngresoAdicional" RENAME COLUMN "monto" TO "montoSinIva";
ALTER TABLE "IngresoAdicional" ADD COLUMN "empresaId" UUID;
ALTER TABLE "IngresoAdicional" ADD COLUMN "porcentajeIva" DECIMAL(18,6) NOT NULL DEFAULT 0.22;
ALTER TABLE "IngresoAdicional" ADD COLUMN "iva" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "IngresoAdicional" ADD COLUMN "montoConIva" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "IngresoAdicional" ADD COLUMN "observaciones" TEXT;
UPDATE "IngresoAdicional"
SET "iva" = ROUND(("montoSinIva" * "porcentajeIva")::numeric, 2),
    "montoConIva" = ROUND(("montoSinIva" + ("montoSinIva" * "porcentajeIva"))::numeric, 2);
CREATE INDEX "IngresoAdicional_empresaId_idx" ON "IngresoAdicional"("empresaId");
CREATE INDEX "IngresoAdicional_anio_mes_idx" ON "IngresoAdicional"("anio", "mes");
ALTER TABLE "IngresoAdicional" ADD CONSTRAINT "IngresoAdicional_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
