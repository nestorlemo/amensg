# AMENSG Activation Billing System

Initial foundation for the AMENSG monthly activation billing platform.

This repository currently contains only the technical foundation, documentation, local execution setup, Prisma data model, seed data, and placeholder UI. CSV import logic, full authentication, billing workflows, and production deployment are intentionally out of scope for this phase.

## Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- shadcn/ui-ready configuration
- Docker and Docker Compose

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop or Docker Engine with Docker Compose

## Environment

Create a local environment file from the example:

```bash
cp .env.example .env
```

For local development outside Docker, set `DATABASE_URL` to a database reachable from the host, for example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amensg?schema=public"
```

For Docker Compose, the example value uses the Compose service name:

```env
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/amensg?schema=public"
```

## Local Setup

Install dependencies:

```bash
npm install
```

Start PostgreSQL with Docker Compose:

```bash
docker compose up -d postgres
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Create and apply the initial migration:

```bash
npm run prisma:migrate
```

Seed initial data:

```bash
npm run prisma:seed
```

Start the development server:

```bash
npm run dev
```

The app runs at `http://localhost:3000`. A basic health endpoint is available at `http://localhost:3000/api/health`.

## Docker

Build and start the app plus PostgreSQL:

```bash
docker compose up --build
```

Start only PostgreSQL for local host development:

```bash
docker compose up -d postgres
```

Stop services:

```bash
docker compose down
```

Remove services and the local PostgreSQL volume:

```bash
docker compose down -v
```

## Prisma

Generate Prisma client:

```bash
npm run prisma:generate
```

Create and apply a development migration:

```bash
npm run prisma:migrate
```

Apply existing migrations in a deployed environment:

```bash
npm run prisma:deploy
```

Seed required foundation data:

```bash
npm run prisma:seed
```

The seed creates:

- Admin user from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`
- Estados de cobro: `PENDIENTE`, `ENVIADO`, `PAGADO`, `CONTADO`, `CHEQUE`, `ANULADO`
- Parametros: `precio_unitario_activacion`, `porcentaje_iva`, `tipo_cambio_usd`
- Gasto conceptos: `Estudio contable`, `IRAE`, `AWS`, `Compra de captchas`, `Certificado AMENSG`, `Facturación electrónica`, `Otros`

## Project Structure

- `app/`: Next.js App Router layout, health endpoint, and placeholder pages.
- `components/`: shared UI shell components.
- `lib/`: shared navigation and utility helpers.
- `docs/`: product, import, data model, business, UI, API, deployment, operations, and acceptance specs.
- `prisma/`: schema, seed, and migrations.
- `storage/importaciones/`: local import file storage placeholder.
- `backups/`: local backup placeholder.

## Validation

Run the foundation checks before adding business logic:

```bash
npx prisma generate
npm run typecheck
npm run lint
npm run build
```

No test runner is configured yet. Add `npm run test` only when tests are introduced.
