# Troubleshooting Guide

Use this guide to diagnose common StrellerMinds Backend issues before escalating.
Start with the quick checks, then follow the section that matches the symptom.

## Quick Checks

1. Confirm dependencies are installed:

```bash
npm install
```

2. Confirm the app builds:

```bash
npm run build
```

3. Run the test suite:

```bash
npm test
```

4. Check service health after startup:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
curl http://localhost:3000/health/live
```

5. Verify local configuration:

```bash
cp .env.example .env
```

Update `.env` with real local values before starting the app.

## Application Does Not Start

### Symptoms

- `npm run start:dev` exits immediately.
- NestJS reports missing providers or invalid configuration.
- The process starts, then fails during module initialization.

### Common Causes

- Required environment variables are missing.
- PostgreSQL or Redis is not running.
- A dependency was not installed after `package.json` changed.
- The configured port is already in use.

### Solutions

1. Run `npm install` to sync dependencies with `package-lock.json`.
2. Copy `.env.example` to `.env` and replace placeholders.
3. Confirm `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_NAME`.
4. Stop the process using port `3000` or set a different `PORT`.
5. Run `npm run build` to catch TypeScript or dependency injection issues.

## Database Connection Failures

### Symptoms

- Startup fails while connecting to PostgreSQL.
- `/health/ready` returns `503`.
- Logs mention authentication, host lookup, timeout, or connection refused errors.

### Common Causes

- PostgreSQL is stopped or unreachable.
- Database credentials in `.env` are incorrect.
- The database has not been created.
- SSL settings do not match the target database.

### Solutions

1. Confirm PostgreSQL is running and reachable from the app host.
2. Verify `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_NAME`.
3. Create the configured database if it does not exist.
4. For production databases, confirm SSL-related values such as `DATABASE_SSL_REJECT_UNAUTHORIZED`, `DATABASE_SSL_CERT`, `DATABASE_SSL_KEY`, and `DATABASE_SSL_CA`.
5. Use `/health/ready` to confirm the app can accept traffic after the fix.

## Connection Pool Exhaustion

### Symptoms

- Requests time out under load.
- Logs mention pool exhaustion, acquire timeouts, or too many waiting requests.
- `/api/database/pool/health` reports high utilization.

### Common Causes

- `DATABASE_POOL_MAX` is too low for current traffic.
- Slow queries hold connections longer than expected.
- Database capacity is lower than application demand.
- Connections are not being released after work completes.

### Solutions

1. Inspect pool health at `/api/database/pool/health` and stats at `/api/database/pool/stats`.
2. Increase `DATABASE_POOL_MAX` conservatively and keep it below the database server limit.
3. Tune `DATABASE_ACQUIRE_TIMEOUT`, `DATABASE_CONNECTION_TIMEOUT`, and query timeout values.
4. Investigate slow queries and long transactions.
5. Review `docs/DATABASE_CONNECTION_POOLING.md` for environment-specific presets.

## Authentication Or Token Errors

### Symptoms

- Login succeeds but later requests return `401`.
- Refresh token requests fail.
- Password reset or email verification tokens are rejected.

### Common Causes

- `JWT_SECRET` or `JWT_REFRESH_SECRET` changed after tokens were issued.
- Secrets are too weak or missing.
- Cookie settings do not match the client environment.
- Token expiration values are shorter than expected.

### Solutions

1. Confirm `JWT_SECRET` and `JWT_REFRESH_SECRET` are set and stable for the environment.
2. Check `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `JWT_EMAIL_EXPIRES_IN`, and `JWT_PASSWORD_RESET_EXPIRES_IN`.
3. Clear old cookies after changing local auth settings.
4. Confirm the client sends credentials when using cookie-based auth.
5. In production, confirm HTTPS is enabled because secure cookie behavior depends on it.

## CORS Rejections

### Symptoms

- Browser requests fail before reaching controllers.
- Logs or browser console mention `Not allowed by CORS`.
- Curl requests work but frontend requests fail.

### Common Causes

- The frontend origin is not listed in `CORS_ORIGINS`.
- The request uses credentials but the client is not configured to include them.
- The frontend is running on a different local port than expected.

### Solutions

1. Set `CORS_ORIGINS` to a comma-separated list of trusted origins.
2. Include the exact scheme, host, and port, for example `http://localhost:3000`.
3. Restart the backend after changing environment variables.
4. Ensure the frontend sends credentials when using cookie auth.

## Validation Errors

### Symptoms

- Requests return `400`.
- Responses mention missing fields, unexpected fields, or invalid formats.
- Properties sent by the client are rejected.

### Common Causes

- DTO validation rejected missing or malformed input.
- Extra properties were sent while `forbidNonWhitelisted` is enabled.
- Query parameters were sent with incompatible types.

### Solutions

1. Compare the request body with the matching DTO in `src/**/dtos`.
2. Remove fields that are not defined by the DTO.
3. Confirm IDs, emails, dates, and enum values use the expected format.
4. Check the OpenAPI contract in `api-specification.yaml` when available.

## OpenAPI Contract Test Failures

### Symptoms

- `npm run test:contract` fails.
- Errors mention request or response schema mismatches.
- A controller works manually but fails contract validation.

### Common Causes

- `api-specification.yaml` is out of sync with controller behavior.
- DTO changes were not reflected in the OpenAPI schema.
- Response status codes or payload shapes changed.

### Solutions

1. Run `npm run test:contract` locally before opening a pull request.
2. Update `api-specification.yaml` when endpoint behavior changes intentionally.
3. Confirm controller responses match documented status codes and schemas.
4. Review `docs/CONTRACT_TESTING.md` for contract validation details.

## CSRF Or Cookie Issues

### Symptoms

- State-changing requests return `403`.
- Login works, but POST, PUT, PATCH, or DELETE requests fail.
- Requests fail only in browsers, not in direct API tools.

### Common Causes

- CSRF protection is applied globally.
- Required cookies or CSRF headers are missing.
- Browser cookie settings block cross-site credentials.

### Solutions

1. Confirm the client preserves and sends auth cookies.
2. Include the expected CSRF token/header for state-changing requests.
3. Align frontend credentials settings with backend CORS configuration.
4. Check cookie domain, secure, and same-site behavior for the target environment.

## Redis Or Queue Failures

### Symptoms

- Background jobs do not process.
- Health checks report Redis as unavailable.
- Logs mention Redis connection refused, timeout, or authentication errors.

### Common Causes

- Redis is stopped or unreachable.
- Redis connection environment variables are missing or incorrect.
- Network rules block the application from reaching Redis.

### Solutions

1. Confirm Redis is running and reachable from the backend.
2. Check the Redis-related environment values used by the deployment.
3. Restart queue workers after Redis configuration changes.
4. Use `/health` to confirm Redis health after recovery.

## File Upload Or Media Processing Problems

### Symptoms

- Upload requests fail with `413`, `400`, or processing errors.
- Video processing jobs fail.
- Generated files are missing from local storage or cloud storage.

### Common Causes

- Request payload exceeds `MAX_REQUEST_SIZE`.
- Upload size or format is blocked by `VIDEO_MAX_FILE_SIZE` or `VIDEO_ALLOWED_FORMATS`.
- `UPLOAD_DIR` or video temp directories are missing or not writable.
- `FFMPEG_PATH` or `FFPROBE_PATH` points to a missing binary.

### Solutions

1. Confirm request size is within `MAX_REQUEST_SIZE`.
2. Check `VIDEO_MAX_FILE_SIZE`, `VIDEO_ALLOWED_FORMATS`, `VIDEO_MAX_DURATION`, and `VIDEO_MIN_DURATION`.
3. Ensure `UPLOAD_DIR` and `VIDEO_PROCESSING_TEMP_DIR` exist and are writable.
4. Verify `FFMPEG_PATH` and `FFPROBE_PATH` in the target environment.

## Secure Logging Redacts Needed Fields

### Symptoms

- Logs show `[REDACTED]` where debugging details were expected.
- Sensitive fields are removed from structured logs.

### Common Causes

- Secure logging is enabled.
- A field name matches `SECURE_LOGGING_SENSITIVE_FIELDS`.

### Solutions

1. Keep `SECURE_LOGGING_ENABLED=true` in shared and production environments.
2. Use request IDs, user IDs, and non-sensitive metadata for debugging.
3. Temporarily adjust local-only logging fields if needed, then restore safe defaults.
4. Never log passwords, tokens, secrets, private keys, or payment details.

## Build Or Test Failures

### Symptoms

- `npm run build` fails.
- `npm test` fails unexpectedly.
- Jest cannot resolve modules or TypeScript types.

### Common Causes

- Dependencies are stale.
- TypeScript path or module imports changed.
- Tests depend on configuration that is missing locally.
- A new feature changed behavior without updating tests.

### Solutions

1. Run `npm install`.
2. Run `npm run build` to separate TypeScript errors from test errors.
3. Run the focused test command for the affected area when available.
4. Update tests when behavior changed intentionally.
5. Check `test/jest.setup.ts` for shared test setup expectations.

## Production HTTPS Redirect Issues

### Symptoms

- Production traffic redirects unexpectedly.
- Requests loop between HTTP and HTTPS.
- Health checks fail only behind a proxy or load balancer.

### Common Causes

- `NODE_ENV=production` enables HTTPS enforcement.
- The reverse proxy does not forward the expected protocol headers.
- Health checks are pointed at HTTP when only HTTPS should be used.

### Solutions

1. Confirm the proxy or load balancer terminates TLS correctly.
2. Configure upstream protocol headers consistently.
3. Point production health checks to the HTTPS endpoint when required.
4. Verify `NODE_ENV` is set intentionally for the environment.

## Escalation Checklist

Include the following when escalating an issue:

- Environment name and branch or commit SHA.
- Exact command, request, or endpoint that failed.
- Sanitized logs with request IDs and timestamps.
- Relevant `.env` keys without secret values.
- Output from `/health` or `/health/ready` when available.
- Recent configuration, dependency, or schema changes.
