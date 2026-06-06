-- CreateIndex
CREATE INDEX IF NOT EXISTS "ImportacionActivacion_estado_idx" ON "ImportacionActivacion"("estado");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ImportacionActivacion_anio_mes_estado_idx" ON "ImportacionActivacion"("anio", "mes", "estado");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivacionImportada_importacionId_idx" ON "ActivacionImportada"("importacionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivacionImportada_empresaId_idx" ON "ActivacionImportada"("empresaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivacionImportada_mid_idx" ON "ActivacionImportada"("mid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivacionImportada_chip_idx" ON "ActivacionImportada"("chip");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivacionImportada_estadoActivacion_idx" ON "ActivacionImportada"("estadoActivacion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivacionImportada_anio_mes_idx" ON "ActivacionImportada"("anio", "mes");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivacionImportada_anio_mes_empresaId_idx" ON "ActivacionImportada"("anio", "mes", "empresaId");
