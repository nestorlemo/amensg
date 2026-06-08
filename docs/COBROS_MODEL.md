# COBROS_MODEL.md

Documentación del modelo `Cobro` en AMENSG. Este es uno de los módulos más críticos del sistema — un error aquí afecta facturación, liquidaciones, cierres y transferencias.

---

## Tipos de cobro

| Tipo | Descripción | Módulo de origen |
|---|---|---|
| `ACTIVACIONES` | Cobro por activaciones mensuales de una empresa | Gestión de Cobros (`/cobros`) vía `POST /api/cobros-activaciones` |
| `DESARROLLO` | Cobro por horas de desarrollo facturadas | Facturación Desarrollo (`/issues/facturar`) al generar factura con `crearCobro: true` |
| `ADICIONAL` | Cobro por ingreso adicional (servicios, otros) | No tiene módulo de creación directa; se crea desde ingresos adicionales cuando corresponde |

---

## Campos del modelo `Cobro`

```prisma
model Cobro {
  id                  String    @id @default(uuid()) @db.Uuid
  tipo                String    // 'ACTIVACIONES' | 'DESARROLLO' | 'ADICIONAL'
  empresaId           String    @db.Uuid
  anio                Int
  mes                 Int
  montoSinIva         Decimal   @db.Decimal(12, 2)
  iva                 Decimal   @db.Decimal(12, 2)
  montoConIva         Decimal   @db.Decimal(12, 2)
  moneda              String    @default("UYU")  // 'UYU' | 'USD'
  estado              String    @default("FACTURADO")
  fechaCobro          DateTime?
  urlPdfFactura       String?
  facturaDesarrolloId String?   @db.Uuid   // solo DESARROLLO
  ingresoAdicionalId  String?   @db.Uuid   // nullable, sin relación Prisma explícita
  cobroFacturaciones  CobroFacturacion[]   // solo ACTIVACIONES
  transferenciaCobros TransferenciaCobro[]
}
```

---

## Campos obligatorios por tipo

| Campo | ACTIVACIONES | DESARROLLO | ADICIONAL |
|---|---|---|---|
| `tipo` | ✅ `"ACTIVACIONES"` | ✅ `"DESARROLLO"` | ✅ `"ADICIONAL"` |
| `empresaId` | ✅ | ✅ | ✅ |
| `anio` / `mes` | ✅ | ✅ | ✅ |
| `montoSinIva` / `iva` / `montoConIva` | ✅ | ✅ | ✅ |
| `moneda` | `UYU` | `USD` | según caso |
| `facturaDesarrolloId` | ❌ | ✅ | ❌ |
| `ingresoAdicionalId` | ❌ | ❌ | nullable (*) |
| `CobroFacturacion` (registros) | ✅ al menos uno | ❌ | ❌ |

(*) Ver nota al pie sobre `ingresoAdicionalId`.

---

## Relaciones por tipo

### ACTIVACIONES → `CobroFacturacion`

Tabla intermedia que vincula un cobro con una o más `FacturacionMensual`.

```
Cobro (ACTIVACIONES) ──< CobroFacturacion >── FacturacionMensual
```

- Se crea en `POST /api/cobros-activaciones` agrupando múltiples facturaciones.
- Un cobro de activaciones puede abarcar varias empresas y períodos.
- La consulta de cobros disponibles excluye facturaciones que ya tienen `CobroFacturacion`.

### DESARROLLO → `facturaDesarrolloId`

Relación directa con `FacturaDesarrollo`.

```
Cobro (DESARROLLO) ──> FacturaDesarrollo ──< FacturaIssue >── Issue
```

- Se crea automáticamente cuando se genera una factura de desarrollo con `crearCobro: true`.
- Los montos en USD, el tipo de cambio y las horas se heredan de la `FacturaDesarrollo`.
- Moneda siempre `USD`.

### ADICIONAL → `ingresoAdicionalId`

Campo nullable sin relación Prisma explícita (ver nota al pie).

```
Cobro (ADICIONAL) ──> IngresoAdicional  (FK sin @relation en schema)
```

### Todos los tipos → `TransferenciaCobro`

Tabla intermedia que vincula cobros con transferencias generadas.

```
Cobro ──< TransferenciaCobro >── Transferencia
```

- Cuando se generan transferencias para un cobro, se crean registros `TransferenciaCobro`.
- Un cobro solo puede tener transferencias generadas una vez.
- La vista de cobros disponibles para transferir filtra por `transferenciaCobros: { none: {} }`.

---

## Estados válidos

| Estado | Descripción | Transición |
|---|---|---|
| `FACTURADO` | Cobro emitido, pendiente de pago | Estado inicial al crear |
| `COBRADO` | Pago recibido | Se marca vía `PUT /api/cobros-unificado/[id]` con `fechaCobro` |

No existen estados intermedios ni cancelados. Un cobro no se anula: se elimina si es necesario.

---

## Cómo se crea cada tipo

### ACTIVACIONES

1. Módulo: **Gestión de Cobros** (`/cobros`) o **Cobros Unificado** (`/cobros-unificado`)
2. Endpoint: `POST /api/cobros-activaciones`
3. Recibe: array de `facturacionIds` + `estado`
4. Crea: un `Cobro` de tipo `ACTIVACIONES` + registros `CobroFacturacion` por cada facturación
5. Las facturaciones deben estar sin cobro previo (`cobroFacturaciones: { none: {} }`)

### DESARROLLO

1. Módulo: **Facturación Desarrollo** (`/issues/facturar`)
2. Endpoint: `POST /api/facturas-desarrollo` con `crearCobro: true`
3. Crea: `FacturaDesarrollo` + `IngresoAdicional` + opcionalmente un `Cobro` vinculado
4. El cobro hereda montos de la factura en USD

### ADICIONAL

- No tiene flujo de creación estándar documentado en el sistema actual.
- El campo `ingresoAdicionalId` es nullable y está pendiente de revisión (ver nota).

---

## Cómo se elimina / anula cada tipo

Los cobros **no se anulan** — se eliminan directamente:

```
DELETE /api/cobros-unificado/[id]
```

- Antes de eliminar, el endpoint captura los datos para auditoría.
- Si el cobro tiene `TransferenciaCobro`, la eliminación fallará por FK constraint (Prisma `RESTRICT`).
- Para eliminar un cobro con transferencias: primero eliminar las transferencias asociadas.

Para DESARROLLO: eliminar la `FacturaDesarrollo` vía `DELETE /api/facturas-desarrollo/[id]` también elimina el `IngresoAdicional` asociado, pero **no elimina automáticamente el `Cobro`**. El cobro de desarrollo debe eliminarse por separado si es necesario.

---

## Cómo afecta a transferencias

1. Un cobro en estado `COBRADO` aparece en la vista "Cobros disponibles para transferir".
2. Al generar transferencias (`POST /api/transferencias` con `cobroIds`), se crean:
   - Una `Transferencia` por socio (agrupando montos de todos los cobros seleccionados de la misma moneda)
   - Registros `TransferenciaCobro` que vinculan cada transferencia con cada cobro incluido
3. Una vez vinculado a `TransferenciaCobro`, el cobro **desaparece** de la vista de disponibles.
4. El monto distribuido por socio depende del tipo:
   - **ACTIVACIONES**: `cobro.montoSinIva × socio.porcentajeParticipacion` (fracción, no porcentaje)
   - **DESARROLLO**: `facturaDesarrollo.totalUSD × distribucion.porcentaje / 100`

---

## Cómo impacta en liquidaciones y cierres

### Liquidaciones

- Las liquidaciones calculan ingresos a partir de `FacturacionMensual` (no directamente de `Cobro`).
- El estado del cobro (`FACTURADO` vs `COBRADO`) sí se refleja en el resumen de cobros del período.
- Los cobros de tipo `DESARROLLO` contribuyen a través del `IngresoAdicional` asociado a la `FacturaDesarrollo`.

### Cierres

- Un cierre mensual toma snapshot de la liquidación al momento del cierre.
- Los cobros marcados como `COBRADO` antes del cierre quedan capturados en el snapshot.
- **Modificar cobros de períodos cerrados puede desincronizar el snapshot del cierre.**
- Nunca modificar ni eliminar cobros de períodos que ya tienen `CierreMensual` en estado `CERRADO` sin autorización.

---

## Qué verificar antes de tocar este módulo

1. **¿El cobro pertenece a un período cerrado?**
   Consultar `CierreMensual` para el `anio`/`mes` del cobro. Si existe y está `CERRADO`, no modificar sin autorización.

2. **¿El cobro tiene transferencias?**
   Verificar `transferenciaCobros`. Si tiene registros, la eliminación fallará.

3. **¿El cobro tiene `CobroFacturacion`?**
   Si es `ACTIVACIONES`, eliminar el cobro puede dejar las facturaciones sin estado de cobro.

4. **¿El cobro está vinculado a una `FacturaDesarrollo`?**
   Si es `DESARROLLO`, modificar el monto del cobro sin modificar la factura genera inconsistencias.

5. **¿Hay lógica de negocio en `calcAnio()` en el endpoint de gráficos?**
   Los reportes anuales excluyen cobros con `estadoCobro.nombre === 'ANULADO'` — verificar si el cambio afecta los gráficos.

---

## Nota sobre `ingresoAdicionalId`

El campo `ingresoAdicionalId` en el modelo `Cobro` es un UUID nullable **sin relación Prisma explícita** (`@relation`). Esto significa:

- Prisma no valida la integridad referencial de este campo.
- No existe FK a nivel de base de datos generada por Prisma para este campo.
- El campo existe en el schema como `String? @db.Uuid` pero sin `IngresoAdicional @relation(...)`.

**Estado**: pendiente de auditar. Antes de agregar la relación explícita se debe:
1. Verificar que todos los valores existentes en producción apuntan a `IngresoAdicional` válidos.
2. Determinar si el campo es necesario en `Cobro` o si la relación debe manejarse solo desde `FacturaDesarrollo.ingresoAdicionalId`.
3. Crear una migración que agregue la FK a nivel de DB si se decide formalizar la relación.

No modificar este campo sin completar la auditoría.
