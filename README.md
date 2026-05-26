# AMENSG Activation Billing System

Initial foundation for the AMENSG activation billing platform.

## Stack
- Next.js (App Router)
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- shadcn/ui-ready structure
- Docker + Docker Compose

## Prerequisites
- Node.js 20+
- npm 10+
- Docker + Docker Compose

## Local setup
1. Clone repository.
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
5. Run migrations:
   ```bash
   npm run prisma:migrate
   ```
6. Seed database:
   ```bash
   npm run prisma:seed
   ```
7. Run app:
   ```bash
   npm run dev
   ```

## Docker Compose
Start services:
```bash
docker compose up --build
```

## Validation commands
```bash
npm run lint
npm run typecheck
npm run build
```
