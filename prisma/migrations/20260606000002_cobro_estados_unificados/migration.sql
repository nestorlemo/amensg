-- Add FK constraints for Cobro relations
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_facturacionMensualId_fkey"
  FOREIGN KEY ("facturacionMensualId") REFERENCES "FacturacionMensual"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_facturaDesarrolloId_fkey"
  FOREIGN KEY ("facturaDesarrolloId") REFERENCES "FacturaDesarrollo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Cobro_facturacionMensualId_idx" ON "Cobro"("facturacionMensualId");
CREATE INDEX "Cobro_facturaDesarrolloId_idx" ON "Cobro"("facturaDesarrolloId");

-- Migrate Cobro states
UPDATE "Cobro" SET "estado" = 'FACTURADO' WHERE "estado" IN ('FACTURADO_PENDIENTE', 'PENDIENTE', 'ENVIADO');
UPDATE "Cobro" SET "estado" = 'COBRADO'   WHERE "estado" = 'FACTURADO_COBRADO';

-- Migrate EstadoCobro: consolidate ENVIADO and FACTURADO_PENDIENTE into PENDIENTE row, then rename to FACTURADO
UPDATE "FacturacionMensual"
  SET "estadoCobroId" = (SELECT id FROM "EstadoCobro" WHERE "codigo" = 'PENDIENTE' LIMIT 1)
  WHERE "estadoCobroId" IN (SELECT id FROM "EstadoCobro" WHERE "codigo" IN ('ENVIADO', 'FACTURADO_PENDIENTE'));

DELETE FROM "EstadoCobro" WHERE "codigo" IN ('ENVIADO', 'FACTURADO_PENDIENTE');

UPDATE "EstadoCobro" SET "codigo" = 'FACTURADO', "nombre" = 'Facturado' WHERE "codigo" = 'PENDIENTE';
UPDATE "EstadoCobro" SET "codigo" = 'COBRADO',   "nombre" = 'Cobrado'   WHERE "codigo" = 'FACTURADO_COBRADO';
