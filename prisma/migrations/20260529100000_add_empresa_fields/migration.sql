-- AlterTable
ALTER TABLE "Empresa"
  ADD COLUMN IF NOT EXISTS "razonSocial" TEXT,
  ADD COLUMN IF NOT EXISTS "rut"         TEXT,
  ADD COLUMN IF NOT EXISTS "direccion"   TEXT,
  ADD COLUMN IF NOT EXISTS "contacto"    TEXT,
  ADD COLUMN IF NOT EXISTS "mail"        TEXT,
  ADD COLUMN IF NOT EXISTS "telefono"    TEXT;
