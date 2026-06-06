-- Issue
CREATE TABLE IF NOT EXISTS "Issue" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "fecha"           TIMESTAMP(3) NOT NULL,
  "descripcion"     TEXT NOT NULL,
  "horasDesarrollo" DECIMAL(8,2) NOT NULL,
  "horasTest"       DECIMAL(8,2) NOT NULL DEFAULT 0,
  "horasRework"     DECIMAL(8,2) NOT NULL DEFAULT 0,
  "totalHoras"      DECIMAL(8,2) NOT NULL,
  "estado"          TEXT NOT NULL,
  "fechaProduccion" TIMESTAMP(3),
  "reportadoPor"    TEXT NOT NULL,
  "prioridad"       TEXT NOT NULL,
  "empresaId"       UUID,
  "creadoEn"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Issue_empresaId_idx" ON "Issue"("empresaId");
CREATE INDEX IF NOT EXISTS "Issue_estado_idx" ON "Issue"("estado");
CREATE INDEX IF NOT EXISTS "Issue_fecha_idx" ON "Issue"("fecha");

-- ValorHoraDesarrollo
CREATE TABLE IF NOT EXISTS "ValorHoraDesarrollo" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "valorUSD"      DECIMAL(10,2) NOT NULL,
  "vigenciaDesde" TIMESTAMP(3) NOT NULL,
  "creadoEn"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ValorHoraDesarrollo_pkey" PRIMARY KEY ("id")
);

-- FacturaDesarrollo
CREATE TABLE IF NOT EXISTS "FacturaDesarrollo" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "anio"               INTEGER NOT NULL,
  "mes"                INTEGER NOT NULL,
  "empresaId"          UUID NOT NULL,
  "totalHoras"         DECIMAL(8,2) NOT NULL,
  "valorHoraUSD"       DECIMAL(10,2) NOT NULL,
  "totalUSD"           DECIMAL(12,2) NOT NULL,
  "tipoCambio"         DECIMAL(10,2) NOT NULL,
  "totalUYU"           DECIMAL(12,2) NOT NULL,
  "iva"                DECIMAL(12,2) NOT NULL,
  "totalConIva"        DECIMAL(12,2) NOT NULL,
  "ingresoAdicionalId" UUID,
  "creadoEn"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacturaDesarrollo_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "FacturaDesarrollo" ADD CONSTRAINT "FacturaDesarrollo_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "FacturaDesarrollo_empresaId_anio_mes_idx" ON "FacturaDesarrollo"("empresaId","anio","mes");

-- FacturaIssue
CREATE TABLE IF NOT EXISTS "FacturaIssue" (
  "facturaId" UUID NOT NULL,
  "issueId"   UUID NOT NULL,
  CONSTRAINT "FacturaIssue_pkey" PRIMARY KEY ("facturaId","issueId")
);
ALTER TABLE "FacturaIssue" ADD CONSTRAINT "FacturaIssue_facturaId_fkey"
  FOREIGN KEY ("facturaId") REFERENCES "FacturaDesarrollo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FacturaIssue" ADD CONSTRAINT "FacturaIssue_issueId_fkey"
  FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DistribucionFactura
CREATE TABLE IF NOT EXISTS "DistribucionFactura" (
  "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
  "facturaId" UUID NOT NULL,
  "socioId"   UUID NOT NULL,
  "porcentaje" DECIMAL(5,2) NOT NULL,
  "montoUYU"  DECIMAL(12,2) NOT NULL,
  CONSTRAINT "DistribucionFactura_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "DistribucionFactura" ADD CONSTRAINT "DistribucionFactura_facturaId_fkey"
  FOREIGN KEY ("facturaId") REFERENCES "FacturaDesarrollo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DistribucionFactura" ADD CONSTRAINT "DistribucionFactura_socioId_fkey"
  FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "DistribucionFactura_facturaId_idx" ON "DistribucionFactura"("facturaId");
