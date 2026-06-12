-- CreateTable
CREATE TABLE "Factura" (
    "id" UUID NOT NULL,
    "urlPdf" TEXT,
    "observaciones" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Cobro" ADD COLUMN "facturaId" UUID;

-- CreateIndex
CREATE INDEX "Cobro_facturaId_idx" ON "Cobro"("facturaId");

-- AddForeignKey
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;
