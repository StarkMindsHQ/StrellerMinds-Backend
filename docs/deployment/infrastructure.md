# Deployment & Infrastructure

The StrellerMinds-Backend is designed to be deployed as a containerized application, supporting both local development and production-grade environments.

## Deployment Strategy

We use **Docker** and **Docker Compose** to manage the lifecycle of the application and its dependencies.

### Environment Matrix
| Environment | Configuration | Purpose |
| :--- | :--- | :--- |
| **Development** | `docker-compose.dev.yml` | Local feature development, debugging with Jaeger. |
| **Testing** | CI Pipeline | Automated Jest (Unit/Integration) and Cypress (E2E) tests. |
| **Production** | `docker-compose.prod.yml` | Hardened production environment with observability. |

---

## Infrastructure Components

### 1. Application Server (NestJS)
- **Role**: Core logic, API endpoints, background jobs.
- **Port**: 3000
- **Health Check**: `/api/health`
- **Configuration**: Managed via `.env` files (S3, Stripe, DB credentials).

### 2. Observability Stack
The production environment (`docker-compose.prod.yml`) includes a complete observability suite:
- **Jaeger**: Distributed tracing for identifying performance bottlenecks across modules.
- **Prometheus**: Metrics collection (CPU, Memory, Request Rate).
- **Grafana**: Dashboarding for visualizing Prometheus and Jaeger data.

### 3. Database & Cache
- **PostgreSQL**: Relational data storage.
- **Redis**: High-speed caching and rate-limiting storage.
- **Elasticsearch**: Full-text search index (managed externally or via separate cluster).

---

## Production Security
The production Docker configuration follows security best practices:
- **User Permission**: Runs with `no-new-privileges:true`.
- **Read-Only FS**: The application root is `read_only: true` with specific `tmpfs` mounts for temporary operations.
- **Resource Limits**: 1GB Memory limit and 1.0 CPU limit per instance to prevent noisy neighbor issues.

## How to Deploy (Production)

1. Ensure the `.env.production` file is populated.
2. Build and start the cluster:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```
3. Verify health via Grafana at port 3001 or directly via the `/api/health` endpoint.
