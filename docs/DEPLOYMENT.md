# StrellerMinds Backend — Production Deployment Guide

This guide covers deploying the StrellerMinds Backend to a production environment.
It targets operators (DevOps / SRE / platform) who need to provision infrastructure,
configure the service, roll out new versions, and respond to incidents. For local
development, see [README.md](../README.md).

> **Source of truth.** The runtime contract is defined by the application code:
> - Container build: [`Dockerfile`](../Dockerfile)
> - Configuration surface: [`.env.example`](../.env.example) (required + optional vars)
> - Bootstrap: [`src/main.ts`](../src/main.ts)
> - DB / pool: [`src/database/database.config.ts`](../src/database/database.config.ts)
> - Health checks: [`src/health/health.controller.ts`](../src/health/health.controller.ts)
> - CI: [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)
>
> If anything in this guide drifts from those files, the files win. Open a PR.

---

## 1. Architecture at a glance

| Component | Role | Required? |
|---|---|---|
| Node.js 20 (LTS) | Application runtime | yes |
| PostgreSQL 15+ | Primary datastore (TypeORM) | yes |
| Redis 6+ | Cache, BullMQ queues, rate limiting, session-style data | yes for prod |
| Reverse proxy (Nginx / ALB / Cloud LB) | TLS termination, HSTS, request routing | yes |
| Object storage (S3 or compatible) | Backups, media (when enabled) | recommended |
| Secrets manager (AWS SM / Vault / GCP SM) | All secret env vars | required for prod |
| Sentry | Error reporting (optional, gated by `SENTRY_ENABLED`) | optional |
| OpenTelemetry collector | Tracing (optional, gated by `OTEL_*`) | optional |

The application is a stateless HTTP API. **All persistent state lives in
PostgreSQL, Redis, or S3.** This is what makes it safe to run multiple replicas
and to roll instances on every deploy.

---

## 2. Prerequisites

- **Node.js 20.x** in CI / build images (the Dockerfile pins `node:20-alpine`).
- **Docker 24+** with Buildx if you build images locally.
- **PostgreSQL 15+** reachable from the app over a private network.
- **Redis 6+** reachable from the app (skip only if you are intentionally running
  a degraded single-process mode — most modules will fail or fall back to noisy
  warnings without it).
- **TLS certificates** for the public domain (managed via your load balancer or
  ACM / cert-manager).
- **A secrets manager.** Do not put production secrets in `.env` files on disk.

---

## 3. Environment configuration

Copy [`.env.example`](../.env.example) and fill in real values via your secrets
manager. The variables below are the **must-set** subset for any production
deploy. The full list (logging, video pipeline, webhook secrets, OTEL, Sentry,
backup retention, etc.) is documented inline in `.env.example`.

### 3.1 Required

| Variable | Purpose | Notes |
|---|---|---|
| `NODE_ENV` | Must be `production`. Drives HSTS, HTTPS redirect, TypeORM `synchronize: false`, log verbosity. | |
| `PORT` | TCP port the app binds to. | Default `3000`. |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME` | Postgres connection. | All five are checked via `getOrThrow` — the app refuses to boot if any are missing. |
| `DB_ENCRYPTION_KEY` | 64-char hex (32 bytes) — column-level encryption key. | Rotate per your KMS policy. |
| `DB_ENCRYPTION_SALT` | Salt for the encryption transformer. | |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Signing keys. | ≥ 32 chars, generated independently per env. |
| `CORS_ORIGINS` | Comma-separated list of allowed origins. | Empty falls back to `http://localhost:3000` — **do not ship that to prod**. |
| `MAX_REQUEST_SIZE` | Body size cap (default `10mb`). | Tune for upload endpoints. |

### 3.2 Strongly recommended

| Variable | Purpose |
|---|---|
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Cache, queues, rate limiting. |
| `DATABASE_POOL_MAX` / `DATABASE_POOL_MIN` | See §4.2. |
| `LOG_LEVEL=info` / `LOG_FORMAT=json` | Structured logs for ingestion. |
| `SENTRY_ENABLED=true` + `SENTRY_DSN` | Error reporting. |
| `BACKUP_*` | Automated backups (see §4.3). |
| `OTEL_*` | Distributed tracing. |

### 3.3 Required only when feature is enabled

- **Stellar / Soroban** — `SOROBAN_RPC_URL`, `STELLAR_NETWORK`,
  `CREDENTIAL_CONTRACT_ID`, `SIGNER_SECRET_KEY`. Signing keys must come from a
  KMS / HSM; never bake them into images.
- **Video pipeline** — AWS S3 + CloudFront (`AWS_*`, `AWS_CLOUDFRONT_*`,
  `VIDEO_*`).
- **Webhooks** — provider-specific signing secrets (`STRIPE_WEBHOOK_SECRET`,
  `PAYPAL_WEBHOOK_SECRET`, `ZOOM_WEBHOOK_SECRET`, `CUSTOM_WEBHOOK_SECRET`).
- **Email** — `SMTP_*`.
- **Elasticsearch** — `ELASTICSEARCH_*`.

### 3.4 Secrets management

1. Generate every secret per environment (dev / staging / prod must not share
   secrets — especially JWT, encryption keys, and Stellar signers).
2. Inject secrets at runtime — environment variables from your orchestrator's
   secret store (Kubernetes `Secret`, ECS task secrets bound from AWS Secrets
   Manager, Nomad templates, etc.). **No `.env` file in the production image.**
3. Audit access. Rotate JWT secrets, DB credentials, and Stellar keys on a
   schedule (recommended ≤ 90 days for blockchain signers).
4. Never log secrets. The repo's `SECURE_LOGGING_*` config redacts a default
   list of fields; if you add new sensitive fields, extend
   `SECURE_LOGGING_SENSITIVE_FIELDS` rather than relying on caller discipline.

---

## 4. Datastores

### 4.1 PostgreSQL

- Provision a managed instance (RDS, Cloud SQL, Aiven) with automated backups
  and point-in-time recovery.
- Use a **private** network endpoint. The app does not require public DB access.
- Create a dedicated role for the app with privileges scoped to its database.
- Enable TLS on the DB and require it from the application network.
- **Do not rely on `synchronize`.** [`src/database/database.config.ts`](../src/database/database.config.ts)
  pins `synchronize: false`; the [`src/app.module.ts`](../src/app.module.ts)
  fallback only auto-syncs in non-production. Production schema changes go
  through migrations.

### 4.2 Connection pool sizing

Defaults (when `NODE_ENV=production`):

- `DATABASE_POOL_MAX` = 20
- `DATABASE_POOL_MIN` = 5
- `DATABASE_IDLE_TIMEOUT` = 30000 ms
- `DATABASE_CONNECTION_TIMEOUT` = 10000 ms

Sizing rule of thumb: `pool_max × replicas ≤ Postgres max_connections − headroom for ops/migrations`.
Example: an `r6g.large` RDS with `max_connections=200`, 6 replicas, 10 connections
of headroom → pool_max ≤ 31. Start at 20 and watch
`/database/pool/stats`.

Pool monitoring endpoints:

- `GET /database/pool/health` — circuit-breaker-aware health summary.
- `GET /database/pool/stats` — pool counters; scrape with Prometheus or curl
  during incidents.

### 4.3 Backups

The repo ships scaffolding for automated backups gated by env vars (see
`BACKUP_*` block in `.env.example`). For production:

- `BACKUP_CLOUD_UPLOAD_ENABLED=true` and point at S3 with cross-region
  replication.
- `BACKUP_ENCRYPTION_ENABLED=true` with a key from your KMS.
- `BACKUP_VERIFICATION_ENABLED=true` and `BACKUP_RECOVERY_TEST_ENABLED=true` so
  failed restores page you instead of being discovered during an outage.
- Tier retention via `BACKUP_DAILY_/WEEKLY_/MONTHLY_/YEARLY_RETENTION_*` to
  match your RPO and any regulatory requirements.

**Independently of this scaffolding, your managed Postgres should have its own
backups enabled.** Two layers, neither sufficient alone.

### 4.4 Redis

- Use a managed Redis (ElastiCache, Memorystore, Upstash) on a private network.
- Require auth (`REDIS_PASSWORD`) and TLS where the provider supports it.
- The app degrades gracefully if Redis is **not configured at all** (the health
  check skips). It does **not** degrade gracefully if Redis was configured and
  then becomes unreachable — that surfaces as `unhealthy` on `/health/ready`,
  which is the correct signal to your load balancer.

---

## 5. Building the image

The [`Dockerfile`](../Dockerfile) is multi-stage. The `production` stage:

- Installs only runtime deps (no dev deps).
- Runs as non-root (`nestjs:nodejs`, uid `1001`).
- Uses `dumb-init` as PID 1 for correct signal forwarding.
- Includes a `HEALTHCHECK` against port 3000.
- Writes logs to `/app/logs` (mount this if you want filesystem logs persisted).

### Build & tag

```bash
docker build \
  --target production \
  --build-arg NODE_OPTIONS="--max-old-space-size=4096" \
  -t ghcr.io/<org>/strellerminds-backend:<git-sha> \
  -t ghcr.io/<org>/strellerminds-backend:latest \
  .
```

### Image hygiene

- Tag every build with the **immutable git SHA**. `latest` is for convenience
  only; deploys must reference the SHA tag so rollbacks are unambiguous.
- Scan images on push. The repo's CI runs `npm audit --audit-level=high` as a
  blocking gate ([`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml));
  add a container-image scanner (Trivy, Grype, Snyk Container) to catch base-image
  CVEs.
- Do not commit `.env` or any other secret into the image. Build context is the
  repo root — secrets that leak into the working tree leak into the layer cache.

---

## 6. Deploying

The repo ships the image build but **does not ship a deploy step**. Wire one of
the following into your existing pipeline.

### 6.1 Docker on a single host

Acceptable for staging / low-traffic single-region deployments. For prod prefer
an orchestrator.

```bash
docker run -d \
  --name strellerminds-backend \
  --restart unless-stopped \
  --env-file /etc/strellerminds/backend.env \
  -p 127.0.0.1:3000:3000 \
  -v /var/log/strellerminds:/app/logs \
  ghcr.io/<org>/strellerminds-backend:<git-sha>
```

Front it with Nginx / Caddy / a managed LB doing TLS, HSTS, and request size
limits. The application performs an HTTP→HTTPS redirect in production
([`src/main.ts`](../src/main.ts)), but TLS termination should happen at the proxy.

### 6.2 Kubernetes (recommended for production)

A minimal manifest. Adjust resources, pull secret, and HPA targets to your load.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: strellerminds-backend
  labels: { app: strellerminds-backend }
spec:
  replicas: 3
  selector: { matchLabels: { app: strellerminds-backend } }
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  template:
    metadata:
      labels: { app: strellerminds-backend }
    spec:
      containers:
        - name: app
          image: ghcr.io/<org>/strellerminds-backend:<git-sha>
          ports: [{ containerPort: 3000 }]
          envFrom:
            - secretRef: { name: strellerminds-backend-secrets }
            - configMapRef: { name: strellerminds-backend-config }
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits:   { cpu: "1",     memory: "1Gi"   }
          startupProbe:
            httpGet: { path: /health/live, port: 3000 }
            failureThreshold: 30
            periodSeconds: 2
          readinessProbe:
            httpGet: { path: /health/ready, port: 3000 }
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet: { path: /health/live, port: 3000 }
            periodSeconds: 10
            failureThreshold: 3
          lifecycle:
            preStop:
              exec: { command: ["sleep", "10"] }
      terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: Service
metadata: { name: strellerminds-backend }
spec:
  selector: { app: strellerminds-backend }
  ports: [{ port: 80, targetPort: 3000 }]
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: strellerminds-backend }
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: strellerminds-backend
  minReplicas: 3
  maxReplicas: 12
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

Probe rationale:

- **Liveness** uses `/health/live` — process-only, no external checks. A
  liveness check that depends on Postgres or Redis will trigger pod restart
  storms during datastore incidents, making the outage worse.
- **Readiness** uses `/health/ready` — checks DB and Redis. When a datastore
  blips, the pod is removed from the Service endpoints (so the LB stops sending
  traffic) but is **not** restarted, so it can recover in place.
- **Full health** at `/health` adds external-service checks; use it for
  dashboards, not probes.

`preStop sleep 10` + `terminationGracePeriodSeconds: 30` gives in-flight
requests time to drain before the process receives `SIGTERM`. The app honors
`enableShutdownHooks()` and `dumb-init` forwards the signal correctly.

### 6.3 Ingress / reverse proxy

At the edge:

- Terminate TLS (TLS 1.2+; prefer 1.3).
- Set `Strict-Transport-Security` if not relying on the app's helmet config.
- Forward `X-Forwarded-For` / `X-Forwarded-Proto` so `req.secure` resolves
  correctly (the HTTPS-redirect middleware in `main.ts` reads `req.protocol`).
- Cap request size at the proxy as a defense in depth (the app caps at
  `MAX_REQUEST_SIZE`, default 10MB).
- Apply WAF / rate-limit rules in front of the app's in-process throttler.

---

## 7. CI / CD

The repo's [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)
provides:

- **Dependency vulnerability gate** — blocks on `npm audit --audit-level=high`.
- **Test & build** matrix on Node 18 / 20.
- **Security audit & testing** jobs.
- **Code quality** (lint, format, `tsc --noEmit`).
- **Docker build** on `main` (image is built and uploaded as an artifact, **not
  pushed to a registry**).
- **Deployment info** summary.

To make this a true CD pipeline, extend the workflow with a job that runs after
`build-docker` on `main`:

1. Push the image to your registry, tagged with `${{ github.sha }}` and `latest`.
2. Run database migrations (one-shot job; out of band from the rolling deploy).
3. Update the deployment manifest (`kubectl set image …`, Helm upgrade,
   ArgoCD sync, ECS task-definition update, etc.).
4. Wait for readiness on the new revision; abort + roll back on failure.

Migrations: **do not** auto-run from the application container on boot. Run them
as a separate, idempotent step before traffic is shifted, so a failed migration
fails the deploy rather than crash-looping live pods.

---

## 8. Observability

### 8.1 Health endpoints

| Endpoint | Use case |
|---|---|
| `GET /health` | Detailed status; dashboards and synthetic monitors. |
| `GET /health/live` | Liveness probe; process check only. |
| `GET /health/ready` | Readiness probe; DB + Redis. |
| `GET /database/pool/health` | Pool circuit-breaker state. |
| `GET /database/pool/stats` | Pool counters for capacity planning. |

### 8.2 Logs

Configure JSON logs and a sane retention via:

```
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=logs/app-%DATE%.log
LOG_FILE_MAX_SIZE=20m
LOG_FILE_MAX_FILES=14
LOG_ERROR_FILE_ENABLED=true
LOG_ERROR_FILE_PATH=logs/error-%DATE%.log
LOG_ERROR_FILE_MAX_FILES=30
SECURE_LOGGING_ENABLED=true
```

In containers, prefer stdout/stderr ingestion (FluentBit / Vector / Datadog
Agent / CloudWatch Agent) over filesystem logs. Filesystem logging is a fallback
for hosts where stdout collection is not available.

### 8.3 Errors and tracing

- **Sentry**: set `SENTRY_ENABLED=true` and `SENTRY_DSN`. Tune
  `SENTRY_TRACES_SAMPLE_RATE` (e.g., `0.05`–`0.2`) to control cost.
- **OpenTelemetry**: set `OTEL_EXPORTER`, `OTEL_COLLECTOR_URL`,
  `OTEL_SAMPLER_PROBABILITY`. Run an OTEL collector close to the workload.

### 8.4 Alerting

`.env.example` defines thresholds and channels for the in-app alerting layer
(`ERROR_RATE_THRESHOLD`, `RESPONSE_TIME_THRESHOLD`, Slack/email/webhook sinks,
rate limiting via `MAX_ALERTS_PER_HOUR`). These complement — they do not replace
— infrastructure-level alerting on:

- Pod restarts / OOMKills.
- Readiness failure rate.
- 5xx rate at the load balancer.
- Postgres connection saturation, replication lag, IOPS, free disk.
- Redis memory + eviction rate.

---

## 9. Security checklist (production)

- [ ] `NODE_ENV=production` is set on every replica.
- [ ] TLS terminates at the LB; the app's HSTS + HTTPS-redirect path is
      reachable for any direct HTTP probes.
- [ ] `CORS_ORIGINS` is an explicit allow-list; no `*`, no localhost.
- [ ] All secrets come from a secrets manager — there is **no `.env` file** in
      the production image or on production hosts.
- [ ] DB credentials, JWT secrets, and Stellar signer keys are unique per env
      and rotated on schedule.
- [ ] `DATABASE_PASSWORD` and `REDIS_PASSWORD` are set; both endpoints are
      private; both require TLS where supported.
- [ ] `synchronize` is off in production (it is, by default — keep it that way).
- [ ] Image is pinned by digest or git SHA, not by `latest`.
- [ ] Container runs as a non-root user (default in the Dockerfile).
- [ ] Pod / task has read-only root filesystem if your platform supports it
      (`/app/logs` is the only write path the app needs).
- [ ] `npm audit --audit-level=high` is a blocking step in CI (already wired).
- [ ] A dependency scanner runs on a schedule (Snyk / Dependabot / Renovate;
      Dependabot is already configured in `.github/dependabot.yml`).
- [ ] Sentry / log ingestion is verified — secrets do not appear in either.
- [ ] Backups are encrypted, replicated cross-region, and **restore-tested**.

---

## 10. Operational runbook

### 10.1 Routine deploy

1. Merge to `main` → CI runs the matrix and builds the image.
2. CD job pushes the image and tags it `<git-sha>` + `latest`.
3. CD job runs migrations against the production database (one-shot Job).
4. CD job updates the Deployment / Service to point at `<git-sha>`.
5. Rolling update brings new pods up. Each pod must pass readiness before the
   old one is removed (`maxUnavailable: 0`).
6. Verify on dashboards: 5xx rate, p95 latency, `/health/ready` of new pods,
   pool saturation, error tracker volume.

### 10.2 Rollback

The fast path is **redeploy the previous SHA** — that is why every image is
tagged with its git SHA.

```bash
kubectl set image deployment/strellerminds-backend \
  app=ghcr.io/<org>/strellerminds-backend:<previous-sha>
kubectl rollout status deployment/strellerminds-backend
```

If the failure was caused by a migration, the rollback path is more involved:
a forward-fix migration is almost always safer than reverting a schema change
under load. Practice this in staging.

### 10.3 Scaling

- **Horizontal**: increase `replicas` / HPA `maxReplicas`. The app is stateless
  — bound by Postgres connections and Redis throughput, not in-process state.
- **Vertical**: bump CPU / memory limits if `node --max-old-space-size` is hit
  (the build step already uses `4096`; runtime defaults are lower).
- **Database pool**: increase `DATABASE_POOL_MAX` only if Postgres
  `max_connections` headroom allows. Watch `/database/pool/stats`.

### 10.4 Incident response

1. **First: contain.** Reduce blast radius (rate limit at the proxy, route
   around a bad region, scale up if saturated).
2. Read `/health` and `/database/pool/health`. Cross-reference Sentry, the
   load balancer's 5xx graph, and Postgres / Redis dashboards.
3. If the previous deploy is suspect: roll back per §10.2.
4. Capture a timeline (alerts, deploys, infra changes) — write the postmortem
   from real timestamps, not memory.

---

## 11. Troubleshooting

| Symptom | Likely cause | Where to look |
|---|---|---|
| App refuses to boot, exits with `Config validation error` for `DATABASE_*` | Missing required env var (`getOrThrow` in `app.module.ts`) | Pod env / secret binding |
| `/health/ready` returns 503; `/health/live` is 200 | DB or Redis unreachable | DB / Redis dashboards; security groups / network policies |
| 502 / 504 spikes during deploy | Termination grace period too short | Increase `terminationGracePeriodSeconds`; verify `preStop` sleep |
| `synchronize` ran in production | `NODE_ENV` not set to `production` | Pod env; the fallback in `app.module.ts` only forces `synchronize: false` when `NODE_ENV === 'production'` |
| Pool exhaustion (`acquireTimeoutMillis` errors) | Replicas × `DATABASE_POOL_MAX` exceeds Postgres `max_connections` | `/database/pool/stats`; lower pool max or scale Postgres |
| HTTP requests over 10MB rejected | `MAX_REQUEST_SIZE` cap | Increase env var; mirror at the proxy |
| CORS blocked in browser | `CORS_ORIGINS` missing the requesting origin | Update env; redeploy |
| Sentry / OTEL silent | `SENTRY_ENABLED` / `OTEL_*` not set | Verify env; both are opt-in |
| Tokens / passwords appearing in logs | Field not in the redaction list | Extend `SECURE_LOGGING_SENSITIVE_FIELDS` |

---

## 12. Change log

This guide is owned alongside the application code. Update it in the same PR
that changes deployment-relevant behavior (new required env var, probe path
change, new datastore dependency, etc.). A guide that is out of date is worse
than no guide at all.
