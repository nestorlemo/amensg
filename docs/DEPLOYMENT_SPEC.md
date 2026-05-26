# DEPLOYMENT_SPEC

Production deployment is not implemented in this phase.

The foundation includes:

- `Dockerfile` for the Next.js application.
- `docker-compose.yml` with `app` and `postgres` services.
- Persistent PostgreSQL volume.
- Environment-driven configuration through `.env`.

The local Compose database service uses PostgreSQL 16 Alpine.
