-- Add performance indexes

-- Issue
CREATE INDEX IF NOT EXISTS "Issue_fechaProduccion_idx" ON "Issue"("fechaProduccion");
CREATE INDEX IF NOT EXISTS "Issue_estado_empresaId_idx" ON "Issue"("estado", "empresaId");
CREATE INDEX IF NOT EXISTS "Issue_estado_fechaProduccion_idx" ON "Issue"("estado", "fechaProduccion");

-- ImportacionActivacion
CREATE INDEX IF NOT EXISTS "ImportacionActivacion_estado_idx" ON "ImportacionActivacion"("estado");

-- FacturaIssue
CREATE INDEX IF NOT EXISTS "FacturaIssue_issueId_idx" ON "FacturaIssue"("issueId");
CREATE INDEX IF NOT EXISTS "FacturaIssue_facturaId_idx" ON "FacturaIssue"("facturaId");
