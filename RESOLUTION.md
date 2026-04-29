# Resolution: Issues #820, #825, #826, #829

This document describes the resolution for four GitHub issues assigned to **YaronZaki**, all closed in a single PR.

---

## #820 — Add Response Time Monitoring

**Priority:** High  
**File:** `src/common/interceptors/response-time.interceptor.ts`

### Problem
API response time degradation was not tracked or alerted on.

### Solution
A NestJS `NestInterceptor` measures the elapsed time for every request using `process.hrtime.bigint()` and attaches it as an `X-Response-Time` header. Slow requests (configurable threshold, default 1000 ms) are logged as warnings via the existing `Logger`.

The interceptor is registered globally in `AppModule`.

### Usage
```
GET /api/courses
→ X-Response-Time: 42ms
```

Slow-request warning in logs:
```
[ResponseTimeInterceptor] SLOW REQUEST: GET /api/courses — 1234ms
```

---

## #825 — Implement Role-Based Access Control (RBAC)

**Priority:** High  
**Files:**
- `src/auth/entities/user.entity.ts` — added `role` column
- `src/auth/guards/roles.guard.ts` — new guard
- `src/auth/decorators/roles.decorator.ts` — `@Roles()` decorator
- `src/auth/enums/role.enum.ts` — `Role` enum

### Problem
No granular permission system existed; all authenticated users had the same access level.

### Solution
A `Role` enum (`admin`, `instructor`, `student`) is stored on the `User` entity. A `RolesGuard` reads the `@Roles()` metadata set on a route handler and compares it against `request.user.role`. The guard is designed to compose with the existing `JwtCookieGuard`.

### Usage
```typescript
@UseGuards(JwtCookieGuard, RolesGuard)
@Roles(Role.Admin)
@Delete(':id')
deleteUser(@Param('id') id: string) { ... }
```

---

## #826 — Add Multi-Factor Authentication (MFA) with TOTP

**Priority:** High  
**Files:**
- `src/auth/entities/user.entity.ts` — added `mfaSecret`, `mfaEnabled` columns
- `src/auth/services/mfa.service.ts` — TOTP generation & verification
- `src/auth/controllers/mfa.controller.ts` — REST endpoints
- `src/auth/dtos/mfa.dto.ts` — request DTOs

### Problem
User accounts had no second factor; a compromised password was sufficient for full access.

### Solution
TOTP-based MFA using the `speakeasy` library (already in `node_modules`):

1. **Enroll** — `POST /auth/mfa/setup` generates a TOTP secret and returns a `otpauth://` URI for QR-code display.
2. **Verify & enable** — `POST /auth/mfa/verify` confirms the first TOTP code and sets `mfaEnabled = true`.
3. **Login flow** — after password validation, if `mfaEnabled` the client must supply a `totpCode`; the auth service validates it before issuing tokens.
4. **Disable** — `POST /auth/mfa/disable` requires a valid TOTP code.

Secrets are stored encrypted (base32) in the database; they are never returned after initial setup.

### Usage
```
POST /auth/mfa/setup          → { otpauthUrl, secret }
POST /auth/mfa/verify         { token: "123456" }
POST /auth/login              { email, password, totpCode?: "123456" }
POST /auth/mfa/disable        { token: "123456" }
```

---

## #829 — Certificate Pinning

**Priority:** Low  
**Files:**
- `src/common/middleware/certificate-pinning.middleware.ts` — server-side header middleware
- `docs/CERTIFICATE_PINNING.md` — mobile client implementation guide

### Problem
Mobile clients were vulnerable to MITM attacks because they did not pin the server's TLS certificate.

### Solution
Certificate pinning is a **client-side** concern. The backend contribution is:

1. **`Public-Key-Pins-Report-Only` / `Expect-CT` headers** — the middleware injects these HTTP headers so clients and browsers can detect certificate mismatches and report them.
2. **Documentation** — `docs/CERTIFICATE_PINNING.md` provides step-by-step instructions for pinning in React Native (iOS/Android) using the `react-native-ssl-pinning` library, including how to extract the certificate hash and handle pin rotation.

> **Note:** Full SSL pinning enforcement (`Public-Key-Pins`) is intentionally set to report-only mode to avoid bricking clients during certificate rotation. Upgrade to enforcement only after validating the pin hash in production.

---

## How to Test

```bash
# Build
npm run build

# Unit tests
npm test

# Manual smoke test (requires running server)
curl -I http://localhost:3000/health | grep X-Response-Time
```

## Closes
- Closes #820
- Closes #825
- Closes #826
- Closes #829




 async findAll(category?: string, difficulty?: string): Promise<Course[]> {
    const key = `courses:all:${category ?? ''}:${difficulty ?? ''}`;
    return this.queryCache.getOrSet(key, async () => {
      const where: Record<string, string> = {};
      if (category) where.category = category;
      if (difficulty) where.difficulty = difficulty;
      return this.courseRepository.find({ where });
    });
  }

  async findOne(id: string): Promise<Course | null> {
    const key = `courses:one:${id}`;
    return this.queryCache.getOrSet(key, () =>
      this.courseRepository.findOne({ where: { id } }),
    );
  }
