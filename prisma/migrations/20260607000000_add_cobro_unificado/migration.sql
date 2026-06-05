CREATE TABLE "Cobro" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tipo" TEXT NOT NULL,
  "empresaId" UUID NOT NULL,
  "anio" INTEGER NOT NULL,
  "mes" INTEGER NOT NULL,
  "montoSinIva" DECIMAL(12,2) NOT NULL,
  "iva" DECIMAL(12,2) NOT NULL,
  "montoConIva" DECIMAL(12,2) NOT NULL,
  "moneda" TEXT NOT NULL DEFAULT 'UYU',
  "estado" TEXT NOT NULL DEFAULT 'FACTURADO_PENDIENTE',
  "fechaCobro" TIMESTAMP(3),
  "urlPdfFactura" TEXT,
  "facturacionMensualId" UUID,
  "facturaDesarrolloId" UUID,
  "ingresoAdicionalId" UUID,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cobro_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Cobro_empresaId_idx" ON "Cobro"("empresaId");
CREATE INDEX "Cobro_anio_mes_idx" ON "Cobro"("anio", "mes");
CREATE INDEX "Cobro_estado_idx" ON "Cobro"("estado");
CREATE INDEX "Cobro_tipo_idx" ON "Cobro"("tipo");

ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
