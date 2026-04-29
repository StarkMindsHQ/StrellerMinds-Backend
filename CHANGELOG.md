# Changelog

All notable changes to the **StrellerMinds Backend** are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Pre-1.0 note.** While the project is on a `0.x` line, the public surface
> (REST endpoints, env-var contract, DB schema) may change between minor
> versions. Treat any breaking change as a `0.MINOR` bump until `1.0.0`.

---

## [Unreleased]

### Added
- _Nothing yet — add new entries here._

### Changed
- _Nothing yet._

### Deprecated
- _Nothing yet._

### Removed
- _Nothing yet._

### Fixed
- _Nothing yet._

### Security
- _Nothing yet._

---

## [0.0.1] - 2026-04-29

Initial baseline matching `package.json` version `0.0.1`. This entry summarizes
the capabilities that already existed when this changelog was first introduced;
it is intentionally high-level rather than a per-commit reconstruction. For
fine-grained history prior to this point, see `git log` and the merged PRs on
GitHub.

### Added

#### Core platform
- NestJS 11 application bootstrap with global validation, versioned URI
  routing (`/v1/...`), CSRF protection, and a global exception filter.
- TypeORM + PostgreSQL integration with a dedicated `DatabaseConfig` (no
  `synchronize` in production), connection-pool monitor, dynamic pool sizing,
  and circuit-breaker-protected query execution.
- Optional Redis (cache, rate limiting, BullMQ-backed jobs) wired through
  `RedisPoolModule`.

#### Domain modules
- `auth`, `user`, `course`, `gdpr`, `cdn`, `health`, `security`,
  `jobs`, and `shared` modules.

#### Observability
- Health endpoints: `GET /health`, `GET /health/live`, `GET /health/ready`.
- Database pool endpoints: `GET /database/pool/health`, `GET /database/pool/stats`,
  and related telemetry routes.
- Structured logging via Winston with rotating files, JSON output, and
  environment-driven retention.
- Optional Sentry + OpenTelemetry integrations, both opt-in via env vars.

#### Security
- HSTS + CSP via Helmet in production and HTTP→HTTPS redirect.
- CORS allow-list driven by `CORS_ORIGINS`.
- Body-size cap via `MAX_REQUEST_SIZE` (default 10 MB).
- Secure-logging interceptor with a default redaction list for sensitive fields.
- Column-level encryption transformer (`DB_ENCRYPTION_KEY` / `DB_ENCRYPTION_SALT`).
- Certificate-pinning middleware and request-ID middleware applied globally.

#### Operations
- Multi-stage `Dockerfile` (development / build / production stages, non-root
  runtime user, `dumb-init` PID 1, baked `HEALTHCHECK`).
- GitHub Actions CI: dependency vulnerability gate, Node 18/20 test matrix,
  security audit, code-quality checks, and Docker build on `main`.
- Backup configuration scaffolding (S3 upload, encryption, cross-region
  replication, tiered retention, recovery testing) gated by `BACKUP_*` env vars.

### Documentation
- `README.md` quick-start.
- `docs/DEPLOYMENT.md` production deployment guide.
- Feature-specific docs under `docs/` (connection pooling, contract testing,
  certificate pinning) and root-level architecture notes.

---

## Maintaining this changelog

Keep this file accurate; a stale changelog is worse than none.

### When to add an entry

Add an entry under `[Unreleased]` in the **same PR** that introduces a
user-visible change. "User-visible" here includes:

- New, removed, or renamed REST endpoints.
- New, renamed, or removed environment variables.
- Schema changes (TypeORM migrations, new entities, dropped columns).
- Behavior changes that affect deployments or operators (probe paths, default
  ports, log format, security headers).
- Public TypeScript types exported from the package, if/when published.
- Notable security fixes — even if also disclosed elsewhere.

### When to skip

Internal-only changes do **not** need an entry:

- Refactors with no behavior change.
- Test-only additions.
- CI tweaks that do not change shipped behavior.
- Dependency bumps that do not change behavior or required env (Dependabot
  patch/minor bumps). Group these into a single `Changed` line per release if
  noteworthy.

### Categories (Keep a Changelog 1.1.0)

Use these and only these:

- **Added** — new features.
- **Changed** — changes in existing functionality.
- **Deprecated** — soon-to-be-removed features (still working, but on notice).
- **Removed** — features removed in this release.
- **Fixed** — bug fixes.
- **Security** — anything that addresses a vulnerability.

### Entry style

- Write in the imperative mood, present tense: "Add X", "Fix Y", "Remove Z".
- One sentence per entry; lead with the change, not the rationale.
- Reference issues/PRs when they exist: `Add tax document IPFS storage (#NNN)`.
- Group breaking changes under their own bold prefix: `**BREAKING:** ...`.
- Do not paste raw commit messages; rephrase for someone reading the file
  cold.

### Releasing

1. Pick the next version per SemVer:
   - **MAJOR** — breaking changes (after `1.0.0`).
   - **MINOR** — backwards-compatible features.
   - **PATCH** — backwards-compatible fixes.
   - On `0.x`: any breaking change bumps `MINOR`.
2. Replace the `[Unreleased]` heading with `[X.Y.Z] - YYYY-MM-DD` (use today's
   UTC date) and create a fresh, empty `[Unreleased]` block above it.
3. Bump `version` in `package.json` to match.
4. Tag the release commit: `git tag -a vX.Y.Z -m "Release X.Y.Z"`.
5. Push the tag: `git push origin vX.Y.Z`.
6. Add the comparison links at the bottom of this file (see template below).

### Template for a new release block

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- Short imperative summary of each addition (#PR).

### Changed
- ...

### Deprecated
- ...

### Removed
- ...

### Fixed
- ...

### Security
- ...
```

### Comparison links

Once tags exist, add or update comparison links at the bottom of the file:

```markdown
[Unreleased]: https://github.com/StarkMindsHQ/StrellerMinds-Backend/compare/vX.Y.Z...HEAD
[X.Y.Z]: https://github.com/StarkMindsHQ/StrellerMinds-Backend/compare/vA.B.C...vX.Y.Z
[A.B.C]: https://github.com/StarkMindsHQ/StrellerMinds-Backend/releases/tag/vA.B.C
```

No tags exist yet, so the links below point at branches and become real
comparison views once the first release is tagged.

[Unreleased]: https://github.com/StarkMindsHQ/StrellerMinds-Backend/commits/main
[0.0.1]: https://github.com/StarkMindsHQ/StrellerMinds-Backend/tree/main
