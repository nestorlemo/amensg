-- Replace the old development fallback with the current default expected by liquidation previews.
UPDATE "Parametro"
SET "valor" = 40.00
WHERE "clave" = 'tipo_cambio_usd'
  AND "valor" = 1.00;
