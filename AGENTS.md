# AGENTS.md — AMENSG Sistema de Gestión Comercial

## Estado del proyecto

**La aplicación está en producción.** Cambios incorrectos pueden afectar datos reales y operaciones del negocio.

## Stack

- **Framework**: Next.js 15 (App Router, `'use client'` / Server Components)
- **Lenguaje**: TypeScript estricto
- **Estilos**: Tailwind CSS
- **ORM**: Prisma 5
- **Base de datos**: PostgreSQL en AWS RDS
- **Deploy**: Railway
- **Librerías clave**: Recharts (gráficos), ExcelJS (exports), bcrypt (auth)

## Módulos productivos

importaciones · activaciones · facturación · cobros · gastos · liquidaciones · cierres · transferencias · issues · reportes · usuarios · empresas · socios · parámetros · auditoría

## Reglas de trabajo

### Branches
- **Nunca trabajar directo sobre `main`.**
- Crear rama por tarea. El equipo hace merge a main.

### Archivos protegidos — no modificar sin autorización explícita
- `.env` y cualquier archivo de variables de entorno
- `prisma/schema.prisma` y `prisma/migrations/`
- Lógica de negocio de: importaciones, facturación, cobros, cierres, liquidaciones
- Endpoints de autenticación (`/api/auth/`)
- Middleware de permisos y roles (`lib/auth.ts`)

### Cambios permitidos sin autorización
- UI/UX: estilos, componentes visuales, textos
- Nuevas páginas que no toquen módulos protegidos
- Correcciones de bugs evidentes con impacto mínimo

### Principios
- Cambios pequeños y reversibles.
- No modificar lógica de negocio sin autorización explícita.
- No renombrar campos de base de datos sin migración y autorización.

## Reglas de datos

- PostgreSQL únicamente. UUID como IDs.
- `Decimal` para dinero — nunca `Float`.
- MID y chip son únicos por `empresaId + anio + mes`, no globalmente.
- Las filas importadas preservan `rawRowJson` y `empresaNombreArchivo`.
- Los registros de facturación y cierre preservan snapshots.
- Las importaciones no se eliminan físicamente.

## Prisma y migraciones

- Todo cambio en `prisma/schema.prisma` requiere migración en `prisma/migrations/`.
- Sin `DATABASE_URL` disponible en el entorno CI, crear la migración SQL manualmente y regenerar el cliente con:
  ```
  DATABASE_URL="postgresql://x:x@localhost/x" npx prisma generate
  ```
- Reportar claramente el nombre de la carpeta de migración y su propósito.

## Validaciones obligatorias antes de terminar toda tarea

```
npm run typecheck
npm run lint
npm run build
npm run test
```

Si el entorno no tiene `DATABASE_URL`, `build` puede fallar en el paso de generación de Prisma — documentarlo en el reporte.

## Reporte de tarea

Al finalizar cada tarea incluir:

1. **Archivos modificados** (lista con ruta completa)
2. **Validaciones ejecutadas** y resultado
3. **Riesgos** o efectos secundarios identificados
4. **Migraciones** creadas (si aplica)
