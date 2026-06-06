-- CreateTable
CREATE TABLE "CobroFacturacion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cobroId" UUID NOT NULL,
  "facturacionMensualId" UUID NOT NULL,
  CONSTRAINT "CobroFacturacion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CobroFacturacion_cobroId_facturacionMensualId_key" UNIQUE ("cobroId", "facturacionMensualId")
);

ALTER TABLE "CobroFacturacion"
  ADD CONSTRAINT "CobroFacturacion_cobroId_fkey"
    FOREIGN KEY ("cobroId") REFERENCES "Cobro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CobroFacturacion"
  ADD CONSTRAINT "CobroFacturacion_facturacionMensualId_fkey"
    FOREIGN KEY ("facturacionMensualId") REFERENCES "FacturacionMensual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CobroFacturacion_cobroId_idx"              ON "CobroFacturacion"("cobroId");
CREATE INDEX "CobroFacturacion_facturacionMensualId_idx" ON "CobroFacturacion"("facturacionMensualId");
