-- CreateTable
CREATE TABLE "Transferencia" (
    "id" UUID NOT NULL,
    "socioId" UUID NOT NULL,
    "cobroId" UUID NOT NULL,
    "moneda" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "cuentaDestino" TEXT,
    "fecha" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "concepto" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transferencia_socioId_idx" ON "Transferencia"("socioId");

-- CreateIndex
CREATE INDEX "Transferencia_cobroId_idx" ON "Transferencia"("cobroId");

-- CreateIndex
CREATE INDEX "Transferencia_estado_idx" ON "Transferencia"("estado");

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_cobroId_fkey" FOREIGN KEY ("cobroId") REFERENCES "Cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
