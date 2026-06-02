-- Add development-related parameters if they don't already exist
INSERT INTO "Parametro" ("id", "clave", "valor", "tipo", "descripcion", "activo", "actualizado")
SELECT gen_random_uuid(), 'porcentaje_test_horas', 30, 'DECIMAL', 'Porcentaje de horas de test sobre horas de desarrollo (issues).', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Parametro" WHERE "clave" = 'porcentaje_test_horas');

INSERT INTO "Parametro" ("id", "clave", "valor", "tipo", "descripcion", "activo", "actualizado")
SELECT gen_random_uuid(), 'porcentaje_rework_horas', 15, 'DECIMAL', 'Porcentaje de horas de rework sobre horas de desarrollo (issues).', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Parametro" WHERE "clave" = 'porcentaje_rework_horas');

INSERT INTO "Parametro" ("id", "clave", "valor", "tipo", "descripcion", "activo", "actualizado")
SELECT gen_random_uuid(), 'valor_hora_desarrollo_usd', 0, 'DECIMAL', 'Valor hora de desarrollo en USD para facturación de issues.', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Parametro" WHERE "clave" = 'valor_hora_desarrollo_usd');
