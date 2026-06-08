# SCRIPTS_OPERATIVOS.md

Inventario de scripts en `scripts/`. Todos se ejecutan con `npx tsx <archivo>` salvo indicación contraria. Ninguno debe ejecutarse en producción sin backup previo cuando se indica.

---

## Resumen rápido

| Script | Propósito | Estado | Seguro re-ejecutar | Toca producción |
|---|---|---|---|---|
| `migrate-issues.ts` | Importar issues históricos desde Excel | Histórico | Sí (con `--dry-run` primero) | Sí |
| `migrate-facturas-historicas.ts` | Crear facturas y cobros históricos de desarrollo (2025-ene a 2026-mar) | Histórico | No | Sí |
| `migrar-cobros.ts` | Migración inicial del modelo de cobros (primer deploy) | No re-ejecutar | No | Sí |
| `migrar-cobros-activaciones.ts` | Crear cobros históricos de activaciones por empresa | Histórico | Con condiciones | Sí |
| `fix-distribucion-abril-2026.ts` | Corregir `montoUYU` en distribuciones de abril 2026 | Histórico | Sí (idempotente) | Sí |
| `fix-transferencias.ts` | Eliminar todas las transferencias existentes | No re-ejecutar | No | Sí |

---

## Detalle por script

---

### `migrate-issues.ts`

**Propósito:** Importar issues históricos desde un archivo Excel (`prisma/seed-data/issues.xlsx` por defecto) a la tabla `Issue`. Normaliza estados, horas, fechas, reportadores y asigna empresa por reportador.

**Estado:** Histórico — ejecutado una vez para cargar el backlog inicial.

**Seguro re-ejecutar:** Sí, con condiciones. Usar siempre `--dry-run` primero para verificar el mapeo. Sin `--dry-run` inserta duplicados si el archivo se reprocesa.

**Toca producción:** Sí.

**Tablas afectadas:** `Issue`

**Fecha aproximada de uso:** Carga inicial del proyecto (pre-2026).

**Requiere backup:** Sí, ante duda.

**Comando:**
```bash
# Dry run (no escribe en DB)
npx tsx scripts/migrate-issues.ts -- --dry-run

# Con archivo por defecto
npx tsx scripts/migrate-issues.ts

# Con archivo específico
npx tsx scripts/migrate-issues.ts -- /ruta/al/archivo.xlsx
```

---

### `migrate-facturas-historicas.ts`

**Propósito:** Crea registros de `FacturaDesarrollo`, `IngresoAdicional` y `DistribucionFactura` para todos los issues en estado `EN_PRODUCCION` con `fechaProduccion <= 2026-03-27` que no tenían factura. Agrupa por mes y empresa, usa tipos de cambio históricos hardcodeados (enero 2025 a marzo 2026), distribuye 50/50 entre los dos socios activos.

**Estado:** Histórico — ejecutado para regularizar la facturación de desarrollo antes del go-live.

**Seguro re-ejecutar:** No. Crea facturas e ingresos para todos los issues sin factura. Si ya se ejecutó, re-ejecutar crea duplicados.

**Toca producción:** Sí.

**Tablas afectadas:** `FacturaDesarrollo`, `IngresoAdicional`, `FacturaIssue`, `DistribucionFactura`

**Fecha aproximada de uso:** Junio 2026 (previo al go-live).

**Requiere backup:** Sí — obligatorio antes de ejecutar.

**Comando:**
```bash
npx tsx scripts/migrate-facturas-historicas.ts
```

**Notas:**
- Tipos de cambio hardcodeados para ene 2025 – mar 2026; períodos fuera de ese rango se saltean con warning.
- La distribución es siempre 50/50 entre `Néstor Lemo` y `Liber Batalla`. Si los socios cambian, el script debe actualizarse.
- No crea `Cobro`; los cobros de desarrollo se crean por separado.

---

### `migrar-cobros.ts`

**Propósito:** Migración inicial del modelo de cobros. Creó registros `Cobro` para todas las `FacturacionMensual`, `FacturaDesarrollo` e `IngresoAdicional` existentes al momento de introducir la tabla `Cobro`. Usaba estados `FACTURADO_COBRADO` y `FACTURADO_PENDIENTE` (estados que ya no existen en el modelo actual).

**Estado:** No re-ejecutar — los estados que genera (`FACTURADO_COBRADO`, `FACTURADO_PENDIENTE`) son inválidos en el modelo actual (`FACTURADO` / `COBRADO`). Este script es un artefacto de la migración inicial.

**Seguro re-ejecutar:** No.

**Toca producción:** Sí.

**Tablas afectadas:** `Cobro`

**Fecha aproximada de uso:** Primera semana de junio 2026 (introducción del modelo de cobros).

**Requiere backup:** N/A — no re-ejecutar bajo ninguna circunstancia.

**Comando:** No ejecutar.

---

### `migrar-cobros-activaciones.ts`

**Propósito:** Crea registros `Cobro` de tipo `ACTIVACIONES` para las empresas históricas, vinculándolos a sus `FacturacionMensual` vía `CobroFacturacion`. Aplica reglas específicas de agrupación: Elared/Relpont/Phinternet se agrupan en un único cobro por mes; VOS y Ciudad Móvil tienen un cobro independiente por empresa y mes. Estado `COBRADO` para períodos anteriores a mayo 2026, `FACTURADO` para mayo 2026 en adelante.

**Estado:** Histórico.

**Seguro re-ejecutar:** Con condiciones. El script verifica que las facturaciones no tengan `CobroFacturacion` previo antes de crear el cobro. Re-ejecutar solo afecta facturaciones sin cobro aún (safe, no duplica).

**Toca producción:** Sí.

**Tablas afectadas:** `Cobro`, `CobroFacturacion`

**Fecha aproximada de uso:** Junio 2026.

**Requiere backup:** Sí.

**Comando:**
```bash
npx tsx scripts/migrar-cobros-activaciones.ts
```

**Notas:**
- Solo procesa empresas con nombres exactos: `Elared`, `Relpont`, `Phinternet`, `VOS`, `Ciudad Móvil`. Otras empresas son ignoradas.
- El corte temporal (COBRADO antes de mayo 2026, FACTURADO desde mayo) está hardcodeado en la constante `CUTOFF`.

---

### `fix-distribucion-abril-2026.ts`

**Propósito:** Corrige el campo `montoUYU` en los registros de `DistribucionFactura` de facturas de desarrollo de abril 2026. Recalcula el monto como `totalUSD × porcentaje / 100` (en USD, no en UYU como estaba mal guardado originalmente).

**Estado:** Histórico — corrección puntual de datos de abril 2026.

**Seguro re-ejecutar:** Sí — idempotente. Recalcula y sobreescribe con el mismo valor correcto.

**Toca producción:** Sí.

**Tablas afectadas:** `DistribucionFactura`

**Fecha aproximada de uso:** Junio 2026 (corrección de datos post-facturación).

**Requiere backup:** No es destructivo, pero recomendable ante duda.

**Comando:**
```bash
npx tsx scripts/fix-distribucion-abril-2026.ts
```

---

### `fix-transferencias.ts`

**Propósito:** Elimina **todas** las transferencias existentes en la tabla `Transferencia`. Fue creado para limpiar transferencias generadas con montos incorrectos antes de corregir el cálculo en el endpoint.

**Estado:** No re-ejecutar — elimina datos productivos sin discriminar. Solo usar si se requiere un reset total de transferencias con coordinación del equipo.

**Seguro re-ejecutar:** No.

**Toca producción:** Sí — destructivo total sobre `Transferencia`.

**Tablas afectadas:** `Transferencia` (y en cascada: `TransferenciaCobro`)

**Fecha aproximada de uso:** Junio 2026 (corrección del módulo de transferencias).

**Requiere backup:** Sí — obligatorio antes de cualquier ejecución.

**Comando:**
```bash
# Solo ejecutar con autorización explícita del equipo
npx tsx scripts/fix-transferencias.ts
```

---

## Procedimiento estándar antes de ejecutar cualquier script

1. **Hacer backup de la DB** (RDS snapshot en AWS o `pg_dump`).
2. Verificar en qué entorno se está ejecutando (`DATABASE_URL`).
3. Si el script tiene `--dry-run`, ejecutarlo primero y revisar el output.
4. Ejecutar el script y revisar el output completo.
5. Verificar en la app que los datos quedan consistentes.
6. Documentar la ejecución (fecha, quién lo corrió, resultado).
