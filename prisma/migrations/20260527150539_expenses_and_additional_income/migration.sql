-- AlterTable
ALTER TABLE "GastoMensual" ALTER COLUMN "fecha" DROP DEFAULT;

-- AlterTable
ALTER TABLE "IngresoAdicional" ALTER COLUMN "porcentajeIva" DROP DEFAULT,
ALTER COLUMN "iva" DROP DEFAULT,
ALTER COLUMN "montoConIva" DROP DEFAULT;
