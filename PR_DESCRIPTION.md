# Fix TypeScript Type Safety Issues (#535)

## Summary
Addresses TypeScript type safety across the codebase by replacing `any` types with proper types/interfaces, fixing compilation errors, and resolving NestJS dependency injection issues so the application builds and starts correctly.

## Changes

### Type safety & compilation
- **JWT / Auth**
  - `jwt.service.ts`: Use `SignOptions['expiresIn']` from `jsonwebtoken` for `expiresIn` (fixes overload errors with `@types/jsonwebtoken`).
  - `auth.guard.ts`: Type `Roles` decorator target; set `request.user = { ...payload, id: payload.sub }` for backward compatibility.
  - `auth.service.ts`: Type `generateQrCodeStream` param as `NodeJS.WritableStream` and return as `Promise<string>`.
- **Shared types**
  - Add `src/common/types/request.types.ts`: `RequestUser` and `RequestWithUser` for typed request context.
  - Use these in controllers (user, social, gamification, achievement, recommendation, integrations) instead of `any` for `@Request()` / `@CurrentUser()`.
- **Error handling**
  - `ErrorResponse.details` → `unknown` in both error-response interfaces.
  - `all-exceptions.filter.ts`: Add `HttpExceptionResponseObject`; type `details` and monitoring context.
  - `http-exception.filter.ts`: Type exception response body.
  - `validation-exception.ts`, `base-exception.ts`, `database-exception.ts`: Use `unknown` for `details`/`errors`.
  - `sentry-exception.filter.ts`: Type `exception` as `unknown`.
- **API responses**
  - Social controller: Return types `SocialGraphResponseDto[]` instead of `any[]`.
  - Achievement controller: Return `BadgeResponseDto`/`BadgeResponseDto[]` and `UserBadge`; use `RequestWithUser`.
  - Recommendation controller: Use `RequestWithUser` and `UserProfileService.getProfileByUserId(user.sub)` for profile resolution.
- **Security & main**
  - `security.config.ts`: Type CSRF `value` with `Request`; use `as const` for referrer policy.
  - `main.ts`: Helmet options via `Parameters<typeof helmet>[0]`; trust proxy via `getHttpAdapter().getInstance()`.
  - `api-security.decorator.ts`: Use `ApiBearerAuth()` instead of `ApiBearerAuth({} as any)`.
- **Forum**
  - `forum.gateway.ts`: Type `emitNewComment` payload as `Record<string, unknown>`.

### Circular dependency & enums
- **Assignments**
  - Add `src/assignments/entities/assignment-enums.ts` with `AssignmentType` and `SubmissionStatus`.
  - `assignment.entity.ts`: Import and re-export enums from `assignment-enums.ts`.
  - `submission.entity.ts`: Import enums from `assignment-enums.ts` and `Assignment` from `assignment.entity.ts`.
- Fixes runtime `TypeError: Cannot read properties of undefined (reading 'DRAFT')` caused by circular import between assignment and submission entities.

### NestJS dependency resolution
- **SecurityAuditService**
  - Inject `ThreatDetectionService` with `@Optional()`; only call `analyzeEvent` when the service is present (forum SecurityModule not required for AuthModule).
- **RecoveryVerificationService**
  - Inject `DisasterRecoveryTestingService` and `EnhancedBackupService` with `@Optional()`; guard usage in scheduled run and `verifyPointInTimeRecovery()`.

### Configuration & startup
- **Config validation** (`configuration.ts`): Relax for local dev — `NODE_ENV` default `development`; `DATABASE_URL`, `AWS_REGION`, `AWS_SECRET_NAME` optional with defaults so app starts without full AWS/DB URL.
- **Sentry** (`main.ts`): Only call `Sentry.init()` when `SENTRY_DSN` is set and not a placeholder (avoids "Invalid Sentry Dsn" when using `.env.example`).

### Integration controllers
- Replace `@CurrentUser() user: any` with `@CurrentUser() user: RequestUser` and use `user.sub` for user id across Google, Microsoft, SSO, Zoom, LTI, Sync, and Integration Dashboard controllers.

## Verification
- [x] `npm run build` succeeds with 0 TypeScript errors.
- [x] No new `any` in modified files; types and interfaces used instead.
- [x] Application starts (further runtime requires PostgreSQL and Redis).

## Files modified
- Auth: `auth.guard.ts`, `auth.service.ts`, `jwt.service.ts`, `security-audit.service.ts`
- Common: `request.types.ts` (new), `base-exception.ts`, `database-exception.ts`, `validation-exception.ts`, `api-security.decorator.ts`, `all-exceptions.filter.ts`, `http-exception.filter.ts`, `error-response.interface.ts`
- Config: `configuration.ts`
- Main: `main.ts`
- Security: `security.config.ts`
- Filters: `sentry-exception.filter.ts`
- Forum: `forum.gateway.ts`
- Assignments: `assignment.entity.ts`, `submission.entity.ts`, `assignment-enums.ts` (new)
- User: `user.controller.ts`, `social.controller.ts`, `achievement.controller.ts`, `recommendation.controller.ts`, `gamification.controller.ts`
- Integrations: Google, Microsoft, SSO, Zoom, LTI, Sync, Integration Dashboard controllers
- Database/backup: `recovery-verification.service.ts`
- Interfaces: `error-response.interface.ts`

Closes #535
