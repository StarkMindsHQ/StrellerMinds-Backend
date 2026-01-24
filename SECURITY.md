# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it by emailing the security team. **Do not create a public GitHub issue.**

### What to Include in Your Report

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Security Update Process

### Automated Security Scanning

- **Daily Scans**: Automated npm audit runs daily at 2 AM UTC via GitHub Actions
- **PR Checks**: All pull requests are automatically scanned for dependency vulnerabilities
- **Critical Alerts**: High and critical vulnerabilities trigger automatic issue creation

### Manual Security Audits

Run security audits locally using:

```bash
# Check for vulnerabilities
npm run audit:security

# Fix vulnerabilities automatically (non-breaking)
npm run audit:fix

# Fix vulnerabilities with breaking changes (use with caution)
npm run audit:fix-force
```

## Dependency Management

### Update Strategy

1. **Critical Updates**: Applied immediately
   - High and critical CVEs are patched within 24 hours
   - Emergency releases may be made outside regular schedule

2. **Regular Updates**: Monthly maintenance
   - Moderate vulnerabilities addressed in monthly updates
   - Low severity issues reviewed quarterly

3. **Breaking Changes**: Planned releases
   - Breaking dependency updates scheduled with major/minor releases
   - Full test suite must pass before deployment

### Package Update Guidelines

- Always review changelogs before updating
- Test thoroughly in development environment
- Use `--legacy-peer-deps` flag when necessary for peer dependency conflicts
- Document any compatibility issues

## Security Best Practices

### Development

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Keep dependencies up to date
- Run security audits before each release
- Enable two-factor authentication on all accounts

### Deployment

- Use secure environment variable management
- Implement proper access controls
- Enable HTTPS/TLS for all connections
- Regular security patches and updates
- Monitor logs for suspicious activity

### API Security

- JWT tokens for authentication
- Rate limiting enabled (see `@nestjs/throttler` config)
- Input validation using `class-validator`
- SQL injection prevention via TypeORM parameterized queries
- CORS properly configured

## Vulnerability Response Timeline

| Severity | Response Time | Patch Release |
|----------|--------------|---------------|
| Critical | < 24 hours   | < 48 hours    |
| High     | < 48 hours   | < 1 week      |
| Moderate | < 1 week     | < 2 weeks     |
| Low      | < 2 weeks    | Next release  |

## Recent Security Updates

### January 2026 - Critical Security Update

**Updated Packages:**
- `@nestjs/common`: Updated to v11.1.12 (fixed Content-Type header RCE vulnerability)
- `@nestjs/core`: Updated to v11.1.12
- `@nestjs/config`: Updated to v4.0.2 (fixed lodash prototype pollution)
- `@nestjs/swagger`: Updated to v11.2.5 (fixed lodash prototype pollution)
- `jest`: Updated to v29.0.0 (fixed braces vulnerability)
- `ts-jest`: Updated to v29.0.0
- `@nestjs-modules/mailer`: Updated to v3.0.0 (fixed mjml-core vulnerability)

**Resolved CVEs:**
- GHSA-cj7v-w2c7-cp7c (High): NestJS RCE vulnerability
- GHSA-xxjr-mmjv-4gpg (Moderate): Lodash prototype pollution
- GHSA-grv7-fg5c-xmjg (High): Braces uncontrolled resource consumption
- Multiple MJML-related vulnerabilities

## Security Contacts

For security-related inquiries, please contact:
- Security Team: [To be configured]
- GitHub Security Advisories: Enabled on repository

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

Last Updated: January 22, 2026
