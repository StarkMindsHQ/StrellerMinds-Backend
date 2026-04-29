# Dependency Vulnerability Scanning

This project uses **Dependabot** and **Snyk + npm audit in GitHub Actions** to continuously detect vulnerable dependencies, open automated upgrade PRs, and block CI on high/critical issues.

## What is configured

- `/.github/dependabot.yml`
  - Daily update checks for:
    - `npm` dependencies
    - GitHub Actions dependencies
  - Auto-generated dependency PRs with labels (`dependencies`, `security`, `automated-pr`)
  - Grouping rules to keep update PRs manageable

- `/.github/workflows/dependency-scan.yml`
  - Runs on:
    - pushes to `main`, `master`, `develop`
    - PRs targeting `main` and `develop`
    - scheduled daily run (`cron`)
    - manual dispatch
  - Uses `npm audit --audit-level=high` to fail on high/critical vulnerabilities
  - Runs `snyk test` (if `SNYK_TOKEN` is set) and fails on high/critical vulnerabilities
  - Runs `snyk monitor` on non-PR events to keep Snyk project monitoring and alerting up to date

- `/.github/workflows/ci-cd.yml`
  - Adds `dependency-vulnerability-gate` job to the CI pipeline
  - Blocks pipeline progression if high/critical vulnerabilities are detected
  - Executes `snyk test` in CI when configured

## Required secrets

- `SNYK_TOKEN` (recommended)
  - Add in: GitHub repository **Settings -> Secrets and variables -> Actions**
  - Without it, `npm audit` gating still runs, but Snyk checks/monitoring are skipped

## Alerts and notifications

- Dependabot alerts and security update PRs are managed by GitHub once Dependabot is enabled in the repo
- Snyk alerts are generated through `snyk monitor` snapshots (requires `SNYK_TOKEN`)
- Failed GitHub Action runs provide immediate CI signal for high/critical findings

## Branch protection recommendation

To enforce the security gate, require these checks in branch protection for `main`:

- `Dependency Vulnerability Gate`
- `npm audit (block high/critical)` from `dependency-scan.yml`
- `Snyk test (block high/critical)` (if `SNYK_TOKEN` is configured)

## Maintenance

- Tune update cadence and grouping in `/.github/dependabot.yml`
- Tune severity threshold in workflows via `--audit-level=high` and `--severity-threshold=high`
- Rotate `SNYK_TOKEN` periodically and after any exposure
