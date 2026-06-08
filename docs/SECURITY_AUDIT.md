# SECURITY_AUDIT.md

Auditoría de seguridad de APIs y permisos de AMENSG. Fecha: 2026-06-08.

---

## 1. Cookie `amensg_rol`

| Propiedad | Valor |
|---|---|
| Nombre | `amensg_rol` |
| `httpOnly` | **`false`** — accesible desde JavaScript del cliente |
| `sameSite` | No configurado explícitamente en el set; solo se configura al borrarla (limpiar) |
| `secure` | No configurado explícitamente |
| Propósito | Permitir que el middleware de Edge (que no puede hacer consultas a DB) lea el rol para restricciones de routing de `ISSUES` |

La cookie de sesión (`amensg_session`) sí es segura:

| Propiedad | Valor |
|---|---|
| Nombre | `amensg_session` |
| `httpOnly` | `true` |
| `sameSite` | `lax` |
| `secure` | `true` en producción (`NODE_ENV === 'production'`) |
| `maxAge` | 43.200 segundos (12 horas) |
| Firma | HMAC-SHA256 con comparación `timingSafeEqual` |

---

## 2. Cómo funciona la autenticación

### `requireApiAuth()`
Llama a `getCurrentUser()` que:
1. Lee `amensg_session` de las cookies del servidor.
2. Verifica la firma HMAC-SHA256 y que no haya expirado.
3. Consulta la DB: `prisma.usuario.findFirst({ where: { id, activo: true } })`.
4. Retorna el usuario o `null`.

Si no hay usuario: responde `401 UNAUTHORIZED`.

### `requireApiAdmin()`
Llama a `requireApiAuth()` y luego verifica `isAdminRole(user.rol)`.
Si no es ADMIN: responde `403 FORBIDDEN`.

### Middleware (`middleware.ts`)
- Rutas públicas (sin sesión): `/login`, `/api/auth/login`, `/api/auth/logout`, `/_next`, `/favicon.ico`.
- Todas las demás rutas requieren que exista la cookie `amensg_session` (presencia, **sin verificar la firma** — eso lo hace la DB en el handler).
- Para el rol `ISSUES` aplica restricciones adicionales de routing basadas en `amensg_rol`.
- OPERADOR y ADMIN no tienen restricciones a nivel middleware.

---

## 3. Endpoints protegidos con `requireApiAdmin`

| Endpoint |
|---|
| `GET/POST /api/auditoria` |
| `POST /api/cierres/[id]/reabrir` |
| `POST /api/importaciones/[id]/anular` |
| `POST /api/liquidaciones/cerrar` |
| `GET/POST /api/parametros` |
| `PUT/DELETE /api/parametros/[id]` |
| `GET/POST /api/socios` |
| `PUT/DELETE /api/socios/[id]` |
| `POST /api/socios/[id]/desactivar` |
| `GET /api/socios/validar-porcentajes` |
| `GET/POST /api/usuarios` |
| `PUT/DELETE /api/usuarios/[id]` |
| `POST /api/usuarios/[id]/desactivar` |

---

## 4. Endpoints protegidos con `requireApiAuth`

| Endpoint |
|---|
| `GET/POST /api/activaciones` |
| `GET /api/activaciones/export` |
| `GET/POST /api/cierres` |
| `GET/PUT/DELETE /api/cierres/[id]` |
| `GET/POST /api/cobros` |
| `GET /api/cobros/resumen` |
| `GET/POST /api/cobros-activaciones` |
| `GET /api/cobros-unificado` |
| `GET/PUT/DELETE /api/cobros-unificado/[id]` |
| `GET /api/cobros-unificado/[id]/pdf` |
| `GET /api/cobros-unificado/resumen` |
| `GET /api/dashboard/resumen` |
| `GET /api/dashboard/stats` |
| `GET/POST /api/empresas` |
| `GET/PUT/DELETE /api/empresas/[id]` |
| `GET/POST /api/facturas-desarrollo` |
| `GET/PUT/DELETE /api/facturas-desarrollo/[id]` |
| `GET/POST /api/facturacion` |
| `GET /api/facturacion/[id]/activaciones` |
| `PUT /api/facturacion/[id]/cambiar-estado-cobro` |
| `GET/POST /api/gastos` |
| `GET/PUT/DELETE /api/gastos/[id]` |
| `GET/POST /api/gastos/conceptos` |
| `GET/PUT/DELETE /api/gastos/conceptos/[id]` |
| `POST /api/gastos/conceptos/[id]/desactivar` |
| `GET/POST /api/importaciones` |
| `GET/DELETE /api/importaciones/[id]` |
| `POST /api/importaciones/confirmar` |
| `GET /api/importaciones/existe` |
| `POST /api/importaciones/preview` |
| `GET/POST /api/ingresos-adicionales` |
| `GET/PUT/DELETE /api/ingresos-adicionales/[id]` |
| `GET/POST /api/issues` |
| `GET/PUT/DELETE /api/issues/[id]` |
| `PUT /api/issues/[id]/estado` |
| `GET/PUT /api/issues/config` |
| `GET /api/issues/export` |
| `POST /api/issues/importar` |
| `GET /api/issues/stats` |
| `GET /api/liquidaciones/preview` |
| `GET /api/reportes/[slug]/export` |
| `GET /api/reportes/facturacion-empresas/export` |
| `GET /api/reportes/facturacion-empresas/export/xlsx` |
| `GET /api/reportes/graficos` |
| `GET /api/tipo-cambio/usd` |
| `GET/POST /api/transferencias` |
| `GET/PUT/DELETE /api/transferencias/[id]` |
| `GET /api/transferencias/cobros-disponibles` |
| `GET /api/transferencias/export` |
| `GET /api/valor-hora` |
| `GET /api/auth/perfil` |

---

## 5. Endpoints SIN protección (públicos)

| Endpoint | Justificación |
|---|---|
| `POST /api/auth/login` | Punto de entrada de autenticación — debe ser público |
| `POST /api/auth/logout` | Limpiar sesión — debe ser público |
| `GET /api/health` | Health check para Railway/infraestructura |

---

## 6. Endpoints que dependen solo del middleware

El middleware solo verifica **presencia** de `amensg_session`, no su validez criptográfica. Esto significa que una cookie con cualquier valor (incluso inválido) pasa el middleware y llega al handler.

Los endpoints que usan `requireApiAuth` o `requireApiAdmin` vuelven a validar en la DB, por lo que están correctamente protegidos.

**Sin embargo**, si existiera algún endpoint que no use ninguna de las dos funciones y no sea de los tres públicos listados arriba, quedaría con una protección solo superficial (presencia de cookie). En la auditoría actual **no se detectaron endpoints en esa situación** — todos los handlers no-públicos llaman a `requireApiAuth` o `requireApiAdmin`.

---

## 7. Posibles brechas detectadas

### B1 — Secret de sesión con fallback inseguro ⚠️ ALTA
```typescript
// lib/auth.ts:138
function sessionSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'amensg-local-dev-secret'
}
```
Si `NEXTAUTH_SECRET` y `JWT_SECRET` no están definidos en producción, todas las sesiones se firman con `'amensg-local-dev-secret'`, un valor público y predecible. Cualquiera podría forjar tokens de sesión válidos.

**Impacto**: Crítico. Permite impersonar cualquier usuario, incluyendo ADMIN.

### B2 — Cookie `amensg_rol` sin `httpOnly` ⚠️ MEDIA
El rol está expuesto a JavaScript del cliente. Un ataque XSS exitoso puede leer el rol, lo que facilita reconocimiento. Más importante: el middleware confía en esta cookie para las restricciones del rol `ISSUES`; si se modifica desde el cliente (o con DevTools) a `OPERADOR`, el middleware dejaría pasar rutas que `ISSUES` no debería ver.

**Impacto**: Medio. El backend valida en DB igual, pero el middleware puede ser bypasseado cambiando `amensg_rol` a `OPERADOR` desde el navegador.

**Ejemplo concreto**: Un usuario `ISSUES` puede abrir DevTools, cambiar `amensg_rol` a `OPERADOR`, y acceder a `/api/cobros` desde el navegador (el middleware lo deja pasar). El handler tiene `requireApiAuth` que valida contra la DB y devolverá los datos porque `OPERADOR` tiene acceso a ese endpoint.

### B3 — Middleware no valida firma de sesión ⚠️ BAJA
El middleware solo verifica que la cookie `amensg_session` exista y tenga un valor. No verifica la firma HMAC. Esto es intencional (el middleware de Edge no tiene acceso a DB), pero combinado con B1, si el secret es conocido, un atacante puede generar cookies válidas que pasen tanto el middleware como los handlers.

### B4 — `/api/health` expone información del entorno ℹ️ INFORMATIVA
El endpoint retorna `environment` y `version`. No es un vector de ataque directo, pero da información sobre el entorno de producción. Bajo riesgo.

### B5 — Sin rate limiting en `/api/auth/login` ⚠️ MEDIA
No hay protección contra fuerza bruta en el endpoint de login. Un atacante puede intentar credenciales indefinidamente.

### B6 — `NEXT_PUBLIC_APP_URL` con fallback `http://` (no HTTPS) ⚠️ BAJA
```typescript
// lib/auth.ts:95
new URL(redirectTo, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
```
Si `NEXT_PUBLIC_APP_URL` no está configurado en producción, los redirects de logout generan URLs con `http://`. En práctica Railway inyecta el protocolo correcto via `x-forwarded-proto`, pero el fallback debería ser `https://`.

---

## 8. Propuesta de mejoras (priorizadas)

### P1 — Validar que `NEXTAUTH_SECRET` esté definido en producción 🔴 CRÍTICO
Agregar en el startup (o en `lib/auth.ts`) una guarda que falle si `NODE_ENV === 'production'` y no hay secret:

```typescript
function sessionSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET must be set in production')
  }
  return secret || 'amensg-local-dev-secret'
}
```

### P2 — Mover rol al payload de sesión, eliminar `amensg_rol` 🟠 ALTA
En lugar de una cookie no-httpOnly para el rol, incluir el rol en el token de sesión firmado. El middleware puede leer el campo del payload sin verificar la firma (solo para routing), pero el backend ya lo valida en DB.

Alternativa más simple: establecer `amensg_rol` con `httpOnly: true` y leerla desde el middleware via `request.cookies.get('amensg_rol')` (que sigue funcionando en Edge — las cookies httpOnly son accesibles en middleware de Next.js).

### P3 — Rate limiting en `/api/auth/login` 🟠 ALTA
Implementar con un contador en memoria (simple) o Redis si está disponible. Máximo 10 intentos por IP en 15 minutos.

### P4 — Autenticar `/api/health` o limitar información 🟡 MEDIA
Opción A: Requerir `requireApiAuth`.
Opción B: Eliminar `environment` y `version` del response (ya implementado con valores genéricos).

### P5 — Corregir fallback de `NEXT_PUBLIC_APP_URL` 🟡 BAJA
Cambiar `'http://localhost:3000'` a `'https://localhost:3000'` o leer el protocolo del request.

---

## Resumen ejecutivo

| # | Brecha | Severidad | Estado |
|---|---|---|---|
| B1 | Secret de sesión con fallback público | 🔴 CRÍTICA | Mitigar con P1 |
| B2 | `amensg_rol` sin httpOnly permite bypass de middleware | 🟠 MEDIA | Mitigar con P2 |
| B3 | Middleware no verifica firma (Edge limitation) | 🟡 BAJA | Aceptado, depende de B1 |
| B4 | `/api/health` expone entorno | ⚪ INFO | Mitigar con P4 |
| B5 | Sin rate limiting en login | 🟠 MEDIA | Mitigar con P3 |
| B6 | Fallback `http://` en redirect de logout | 🟡 BAJA | Mitigar con P5 |

La cobertura de autenticación en los handlers es **completa**: todos los endpoints no-públicos usan `requireApiAuth` o `requireApiAdmin`, con validación contra la DB en cada request. El principal riesgo operativo es B1 (secret de sesión), que debe verificarse en el entorno de Railway antes de cualquier otra acción.
