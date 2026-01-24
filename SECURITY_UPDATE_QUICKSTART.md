# Security Update Quick Start Guide

## ⚠️ IMPORTANT: Read Before Installing

This update includes major version updates to critical dependencies. Follow these steps carefully.

## Prerequisites

- Node.js 18+ installed
- npm 8+ installed
- Backup your current `node_modules` and `package-lock.json`

## Installation Steps

### 1. Clean Install (Recommended)

```bash
# Remove existing dependencies
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Install updated dependencies
npm install

# Verify installation
npm list --depth=0
```

### 2. Verify Security Status

```bash
# Run security audit
npm run audit:security

# Expected: Significantly reduced vulnerabilities
# Remaining low-severity issues are acceptable
```

### 3. Build & Test

```bash
# Build the application
npm run build

# Run unit tests
npm test

# Run E2E tests (if configured)
npm run test:e2e

# Lint the code
npm run lint
```

## Expected Results

### Before Updates
- 60+ vulnerabilities (4 low, 20 moderate, 36 high)
- Critical packages on outdated versions

### After Updates
- Significantly reduced vulnerabilities
- All critical CVEs resolved
- Only dev-dependency issues may remain

## Common Issues & Solutions

### Issue 1: Peer Dependency Warnings

**Error**: `ERESOLVE unable to resolve dependency tree`

**Solution**: Already configured in `.npmrc` with `legacy-peer-deps=true`

### Issue 2: TypeScript Compilation Errors

**Error**: Type errors after update

**Solution**: 
```bash
# Clear TypeScript cache
Remove-Item -Recurse -Force dist
npm run build
```

### Issue 3: Jest Test Failures

**Error**: Tests failing with configuration errors

**Solution**: Jest config already updated to v29 format. If issues persist:
```bash
# Clear Jest cache
npx jest --clearCache
npm test
```

### Issue 4: Import Errors

**Error**: Cannot find module errors

**Solution**:
```bash
# Reinstall dependencies
Remove-Item -Recurse -Force node_modules
npm install
```

## Verification Checklist

After installation, verify:

- [ ] `npm install` completes without errors
- [ ] `npm run build` succeeds
- [ ] `npm test` passes all tests
- [ ] Application starts: `npm run start:dev`
- [ ] Swagger UI loads at http://localhost:3000/api
- [ ] Authentication endpoints work
- [ ] File upload endpoints work
- [ ] Email service works
- [ ] Database connections succeed

## Package Version Reference

### Updated Packages

| Package | Old Version | New Version |
|---------|-------------|-------------|
| @nestjs/common | 10.0.0 | 11.1.12 |
| @nestjs/core | 10.0.0 | 11.1.12 |
| @nestjs/config | 3.0.0 | 4.0.2 |
| @nestjs/platform-express | 10.4.22 | 11.1.12 |
| jest | 26.5.3 | 29.0.0 |
| ts-jest | 26.5.6 | 29.0.0 |
| @nestjs-modules/mailer | 2.0.2 | 3.0.0 |

## Security Commands

```bash
# Check for vulnerabilities
npm run audit:security

# Fix non-breaking vulnerabilities
npm run audit:fix

# Fix all vulnerabilities (may break)
npm run audit:fix-force
```

## CI/CD Integration

Security scanning is now automated:
- Runs on every push to main/develop
- Runs on every pull request
- Runs daily at 2 AM UTC
- Creates issues for critical vulnerabilities

## Need Help?

1. Check [SECURITY_UPDATE_SUMMARY.md](./SECURITY_UPDATE_SUMMARY.md) for detailed info
2. Check [SECURITY.md](./SECURITY.md) for security policies
3. Create a GitHub issue with:
   - Error message
   - npm version (`npm -v`)
   - Node version (`node -v`)
   - Operating system
   - Steps to reproduce

## Rollback Instructions

If you need to rollback:

1. Restore backup of `package.json`
2. Remove `node_modules` and `package-lock.json`
3. Run `npm install`
4. Create incident report

## Next Steps

1. ✅ Install dependencies
2. ✅ Run security audit
3. ✅ Build and test
4. ✅ Start development server
5. ✅ Verify functionality
6. ✅ Commit changes
7. ✅ Deploy to staging
8. ✅ Test in staging
9. ✅ Deploy to production

---

**Last Updated**: January 22, 2026  
**Author**: DevOps/Security Team
