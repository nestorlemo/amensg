-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Socio" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Socio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametro" (
    "id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" DECIMAL(18,6) NOT NULL,
    "descripcion" TEXT,
    "actualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parametro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoCobro" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "EstadoCobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacionActivacion" (
    "id" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "nombreArchivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "anuladaEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacionActivacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivacionImportada" (
    "id" UUID NOT NULL,
    "importacionId" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "mid" TEXT NOT NULL,
    "chip" TEXT NOT NULL,
    "empresaNombreArchivo" TEXT NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "rawRowJson" JSONB NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivacionImportada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturacionMensual" (
    "id" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(18,2) NOT NULL,
    "porcentajeIva" DECIMAL(18,6) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "iva" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "snapshot" JSONB,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacturacionMensual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoConcepto" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GastoConcepto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoMensual" (
    "id" UUID NOT NULL,
    "conceptoId" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "GastoMensual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngresoAdicional" (
    "id" UUID NOT NULL,
    "descripcion" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngresoAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CierreMensual" (
    "id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreMensual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CierreSocio" (
    "id" UUID NOT NULL,
    "cierreMensualId" UUID NOT NULL,
    "socioId" UUID NOT NULL,
    "empresaId" UUID,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "CierreSocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" UUID NOT NULL,
    "usuarioId" UUID,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Parametro_clave_key" ON "Parametro"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoCobro_codigo_key" ON "EstadoCobro"("codigo");

-- CreateIndex
CREATE INDEX "ImportacionActivacion_empresaId_anio_mes_idx" ON "ImportacionActivacion"("empresaId", "anio", "mes");

-- CreateIndex
CREATE INDEX "ActivacionImportada_importacionId_idx" ON "ActivacionImportada"("importacionId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivacionImportada_empresaId_anio_mes_mid_key" ON "ActivacionImportada"("empresaId", "anio", "mes", "mid");

-- CreateIndex
CREATE UNIQUE INDEX "ActivacionImportada_empresaId_anio_mes_chip_key" ON "ActivacionImportada"("empresaId", "anio", "mes", "chip");

-- CreateIndex
CREATE UNIQUE INDEX "FacturacionMensual_empresaId_anio_mes_key" ON "FacturacionMensual"("empresaId", "anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "GastoConcepto_nombre_key" ON "GastoConcepto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CierreMensual_anio_mes_key" ON "CierreMensual"("anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "CierreSocio_cierreMensualId_socioId_empresaId_key" ON "CierreSocio"("cierreMensualId", "socioId", "empresaId");

-- AddForeignKey
ALTER TABLE "ImportacionActivacion" ADD CONSTRAINT "ImportacionActivacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivacionImportada" ADD CONSTRAINT "ActivacionImportada_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "ImportacionActivacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivacionImportada" ADD CONSTRAINT "ActivacionImportada_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturacionMensual" ADD CONSTRAINT "FacturacionMensual_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoMensual" ADD CONSTRAINT "GastoMensual_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "GastoConcepto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreSocio" ADD CONSTRAINT "CierreSocio_cierreMensualId_fkey" FOREIGN KEY ("cierreMensualId") REFERENCES "CierreMensual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreSocio" ADD CONSTRAINT "CierreSocio_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreSocio" ADD CONSTRAINT "CierreSocio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
