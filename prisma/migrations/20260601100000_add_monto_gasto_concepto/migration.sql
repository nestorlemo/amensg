-- Add monto field to GastoConcepto for fixed expenses
ALTER TABLE "GastoConcepto" ADD COLUMN IF NOT EXISTS "monto" DECIMAL(12,2);
ALTER TABLE "GastoConcepto" ADD COLUMN IF NOT EXISTS "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
