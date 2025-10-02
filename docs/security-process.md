# Security & Compliance Process

## Automated Security Scanning

- Run `npm run security:audit` for vulnerability scanning (audit-ci)
- Run `npm run security:snyk` for deep vulnerability scanning (Snyk)

## Compliance Checking

- Run `npm run security:licenses` to check for license compliance

## Vulnerability Management

- All vulnerabilities are reported in CI/CD logs
- Track and resolve issues using GitHub Issues or your ticketing system

## Security Monitoring

- Enable application-level logging and monitoring (e.g., Winston, Sentry, Prometheus)
- Set up alerts for suspicious activity (see `@willsoto/nestjs-prometheus` for metrics)

## Security Reporting Dashboard

- Use CI/CD summary reports for now
- For advanced dashboards, integrate with Snyk, SonarQube, or custom dashboards

## Next Steps

- Uncomment the security steps in `.github/workflows/ci-cd.yml` to enable in CI
- Review and address vulnerabilities regularly
- Consider integrating Sentry or similar for runtime monitoring
