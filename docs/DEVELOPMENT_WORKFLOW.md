# DEVELOPMENT_WORKFLOW.md

Guía operativa para desarrollar en AMENSG. La aplicación está en producción — seguir este flujo evita romper datos reales.

---

## 1. Crear una rama

Siempre desde `main` actualizado:

```bash
git checkout main
git pull origin main
git checkout -b feat/nombre-descriptivo
# o: fix/nombre-bug, chore/nombre-tarea
```

**Nunca trabajar directo en `main`.** El merge lo hace el equipo después de revisar el PR.

---

## 2. Trabajar con Claude / Codex

- Darle contexto del módulo afectado, no del proyecto completo.
- Indicar explícitamente qué archivos **no** debe tocar (ver sección 4).
- Pedir cambios pequeños y reversibles, un módulo por sesión.
- Revisar el diff antes de aceptar cualquier cambio generado.
- Si el agente propone modificar Prisma o migraciones, **pedir confirmación al equipo antes de continuar**.
- No incluir en el contexto: `.env`, `.git/`, `.next/`, `node_modules/`.

---

## 3. Comandos antes de finalizar

Ejecutar en orden antes de cada commit o PR:

```bash
npm run validate
```

Que equivale a:

```bash
npm run typecheck   # TypeScript sin errores
npm run lint        # ESLint sin errores (warnings aceptables)
npm run build       # Build de producción exitoso
npm run test        # Tests unitarios pasando
```

Si alguno falla, no hacer PR hasta resolverlo (ver sección 9).

---

## 4. Archivos que no tocar sin autorización explícita

| Archivo / Directorio | Motivo |
|---|---|
| `.env` / `.env.*` | Credenciales de producción |
| `prisma/schema.prisma` | Modelo de datos productivo |
| `prisma/migrations/` | Historial de migraciones aplicadas en prod |
| `lib/auth.ts` | Autenticación y permisos |
| `middleware.ts` | Guards de rutas |
| `app/api/auth/` | Endpoints de login/logout/sesión |
| `app/api/importaciones/` | Lógica de importación de activaciones |
| `app/api/facturacion/` | Cálculos de facturación mensual |
| `app/api/cobros/` | Lógica de cobros |
| `app/api/liquidaciones/` | Cálculo de liquidaciones |
| `app/api/cierres/` | Cierre mensual |

Cambios en estos archivos requieren revisión del equipo y prueba explícita antes del merge.

---

## 5. Validar antes de PR

```bash
# 1. Asegurarse de estar en la rama correcta
git status

# 2. Correr todas las validaciones
npm run validate

# 3. Revisar el diff completo
git diff main...HEAD

# 4. Verificar que no haya archivos sensibles en staging
git diff --name-only main...HEAD
```

El PR no debe incluir cambios en `.env`, archivos de build (`.next/`), ni `node_modules/`.

---

## 6. Hacer PR a main

```bash
# Asegurarse de que la rama esté actualizada con main
git fetch origin main
git rebase origin/main

# Push de la rama
git push -u origin feat/nombre-descriptivo
```

Luego crear el PR en GitHub:
- **Título**: corto y descriptivo (`feat: agregar módulo transferencias`)
- **Descripción**: qué cambia, por qué, cómo probar, archivos clave modificados
- **Asignado a**: revisor del equipo
- El PR se mergea solo cuando `validate` pasa en CI y hay aprobación

---

## 7. Migraciones de Prisma

### Flujo normal (con acceso a la DB)

```bash
# 1. Modificar prisma/schema.prisma
# 2. Crear y aplicar la migración
npx prisma migrate dev --name descripcion_del_cambio
# 3. Regenerar el cliente
npx prisma generate
```

### Sin DATABASE_URL en el entorno (CI / Codespaces nuevos)

```bash
# 1. Modificar prisma/schema.prisma
# 2. Crear la migración SQL manualmente en:
#    prisma/migrations/YYYYMMDDXXXXXX_nombre/migration.sql
# 3. Regenerar solo el cliente
DATABASE_URL="postgresql://x:x@localhost/x" npx prisma generate
```

### Reglas

- Cada cambio en `schema.prisma` requiere su migración correspondiente.
- Nunca editar una migración ya aplicada en producción.
- Incluir siempre la migración en el mismo commit que el cambio de schema.
- Documentar el propósito de la migración en el nombre de la carpeta.

---

## 8. Compartir contexto sin exponer secretos

Al compartir código o contexto con Claude/Codex o en un PR:

**Incluir:**
- Archivos `.ts` / `.tsx` relevantes
- `prisma/schema.prisma`
- `package.json`
- `AGENTS.md`, `docs/`

**Nunca incluir:**
- `.env` / `.env.local` / `.env.production`
- `.git/`
- `.next/`
- `node_modules/`
- Logs con credenciales o tokens

Para compartir el estado del proyecto en texto, usar:

```bash
git diff main...HEAD          # cambios de la rama
git log --oneline -10         # commits recientes
npx prisma format && cat prisma/schema.prisma  # schema limpio
```

---

## 9. Cómo proceder si build / lint / test falla

### TypeScript (`typecheck`)

```bash
npm run typecheck 2>&1 | head -50
```

- Leer el error, identificar el archivo y línea.
- Corregir el tipo sin cambiar la lógica funcional.
- No usar `as any` salvo casos extremos justificados.

### ESLint (`lint`)

```bash
npm run lint -- --fix   # corrige automáticamente lo que puede
npm run lint            # ver lo que queda
```

- Errores bloqueantes: deben resolverse antes del PR.
- Warnings: documentar si no se van a corregir ahora.

### Build (`build`)

- Si falla por Prisma sin `DATABASE_URL`:

  ```bash
  DATABASE_URL="postgresql://x:x@localhost/x" npm run build
  ```

- Si falla por un import roto o tipo incorrecto: corregir el archivo indicado.
- No comentar código para que compile — resolver el problema real.

### Tests (`test`)

```bash
npm run test 2>&1
```

- Si falla un test existente por un cambio tuyo: corregir el código o el test (nunca eliminar el test).
- Si el test es flaky (falla intermitente): investigar antes de hacer PR.

---

## 10. Flujo en Codespaces (entorno nuevo)

Al abrir un Codespace o clonar el repo en un entorno fresco:

```bash
# 1. Instalar dependencias
npm install

# 2. Crear .env.local a partir del ejemplo
cp .env.example .env.local
# Editar .env.local con las credenciales reales (pedir al equipo)

# 3. Generar el cliente Prisma
npx prisma generate

# 4. Aplicar migraciones pendientes en la DB
npx prisma migrate deploy

# 5. (Opcional) Seed de datos de prueba
npx prisma db seed

# 6. Levantar el servidor de desarrollo
npm run dev
```

La app queda disponible en `http://localhost:3000`.

---

## 11. Rollback si algo sale mal en producción

Railway no tiene rollback automático con un comando. El proceso conceptual es:

### Rollback de código

```bash
# Identificar el commit anterior estable
git log --oneline -10

# Crear una rama de hotfix desde ese commit
git checkout -b hotfix/rollback <hash-del-commit-estable>

# Push y deploy inmediato desde Railway apuntando a esa rama
git push -u origin hotfix/rollback
```

En Railway: ir a **Deployments → redeploy** el build anterior, o apuntar el servicio a la rama `hotfix/rollback`.

### Rollback de migración de base de datos

Prisma **no tiene rollback automático**. El proceso es:

1. Escribir una migración SQL inversa manualmente (`ALTER TABLE` o `DROP COLUMN`).
2. Crear la carpeta en `prisma/migrations/` con nombre descriptivo (`_rollback_nombre`).
3. Aplicar con `npx prisma migrate deploy` en producción.
4. Nunca editar la migración original — siempre agregar una nueva.

### Prevención

- Nunca hacer `DROP TABLE` ni `DROP COLUMN` sin estar seguro de que los datos no son necesarios.
- Para columnas en desuso, marcarlas como opcionales primero (`String?`) y eliminarlas en una migración posterior.
- Hacer backup de la DB (RDS snapshot) antes de migraciones destructivas.
