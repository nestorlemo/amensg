-- Make cobroId optional on Transferencia
ALTER TABLE "Transferencia" ALTER COLUMN "cobroId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TransferenciaCobro" (
    "id" UUID NOT NULL,
    "transferenciaId" UUID NOT NULL,
    "cobroId" UUID NOT NULL,

    CONSTRAINT "TransferenciaCobro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferenciaCobro_transferenciaId_cobroId_key" ON "TransferenciaCobro"("transferenciaId", "cobroId");

-- CreateIndex
CREATE INDEX "TransferenciaCobro_transferenciaId_idx" ON "TransferenciaCobro"("transferenciaId");

-- CreateIndex
CREATE INDEX "TransferenciaCobro_cobroId_idx" ON "TransferenciaCobro"("cobroId");

-- AddForeignKey
ALTER TABLE "TransferenciaCobro" ADD CONSTRAINT "TransferenciaCobro_transferenciaId_fkey" FOREIGN KEY ("transferenciaId") REFERENCES "Transferencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaCobro" ADD CONSTRAINT "TransferenciaCobro_cobroId_fkey" FOREIGN KEY ("cobroId") REFERENCES "Cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
