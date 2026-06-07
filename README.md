# AMENSG — Sistema de Gestión Comercial

Sistema interno de gestión para AMENSG IT Automation. Desplegado en producción en https://amensg-production.up.railway.app

## Stack

- **Frontend/Backend**: Next.js 15, App Router, TypeScript
- **Base de datos**: PostgreSQL (AWS RDS) via Prisma ORM 5.22
- **Deploy**: Railway (Docker)
- **Desarrollo**: GitHub Codespaces

## Módulos

- **Importaciones**: Carga de activaciones desde CSV (hasta 50MB, múltiples períodos)
- **Activaciones**: Consulta y exportación de activaciones importadas
- **Gestión de Facturación**: Facturación de activaciones, desarrollo e ingresos adicionales
- **Gestión de Cobros**: Vista unificada de cobros por tipo, subida de PDFs
- **Issues**: Gestión de issues de desarrollo con estados y facturación
- **Gestión Mensual**: Gastos, liquidaciones y cierres mensuales
- **Reportes**: Gráficos de facturación, activaciones y resultados
- **Administración**: Empresas, socios, usuarios, parámetros, auditoría

## Desarrollo

### Requisitos
- Node.js 20+
- Acceso a AWS RDS (variable DATABASE_URL)

### Setup
```bash
cp .env.example .env
# Completar DATABASE_URL con la conexión a AWS RDS
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

### Scripts útiles
```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm test           # Tests unitarios (19 tests)
npm run lint       # Linting
```

### Deploy
Railway detecta automáticamente los pushes a `main` y redespliega.
Las migraciones de DB se aplican manualmente con `npx prisma migrate deploy`.

## Estructura

```
app/          # Páginas y API routes (Next.js App Router)
components/   # Componentes React reutilizables
lib/          # Lógica de negocio, helpers y acceso a datos
prisma/       # Schema, migraciones y seed
scripts/      # Scripts de migración de datos históricos
tests/        # Tests unitarios
```
