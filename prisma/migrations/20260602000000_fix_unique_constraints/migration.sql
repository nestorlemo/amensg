-- Drop unique constraint on GastoConcepto.nombre (was too strict — conceptos can share names across types)
ALTER TABLE "GastoConcepto" DROP CONSTRAINT IF EXISTS "GastoConcepto_nombre_key";

-- Add unique constraint on Empresa.nombre if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Empresa_nombre_key') THEN
    ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_nombre_key" UNIQUE ("nombre");
  END IF;
END $$;
