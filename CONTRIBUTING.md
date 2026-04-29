# Contributing to StrellerMinds Backend

Thank you for your interest in contributing! This guide covers everything you need to get started — from setting up your environment to getting your PR merged.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Branching Strategy](#branching-strategy)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

Be respectful, inclusive, and constructive. We expect all contributors to maintain a welcoming environment for everyone regardless of experience level, background, or identity.

---

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL
- npm or yarn
- Git

### Local Setup

```bash
# Clone the repository
git clone https://github.com/StarkMindsHQ/strellerminds-backend.git
cd strellerminds-backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in the required values in .env

# Start in development mode
npm run start:dev
```

---

## Branching Strategy

Always branch off from `main` (or the designated development branch). Use the following naming conventions:

| Type        | Pattern                          | Example                          |
|-------------|----------------------------------|----------------------------------|
| Feature     | `feat/<short-description>`       | `feat/user-profile-endpoint`     |
| Bug fix     | `fix/<short-description>`        | `fix/jwt-expiry-handling`        |
| Chore       | `chore/<short-description>`      | `chore/update-dependencies`      |
| Docs        | `docs/<short-description>`       | `docs/add-contributing-guide`    |
| Refactor    | `refactor/<short-description>`   | `refactor/auth-service-cleanup`  |
| Hotfix      | `hotfix/<short-description>`     | `hotfix/critical-auth-bypass`    |

Never commit directly to `main` or `develop`.

---

## Coding Standards

This project uses **TypeScript**, **NestJS**, **TypeORM**, and follows a **Clean Architecture** pattern. Please read `CLEAN_ARCHITECTURE.md` for the full architectural overview.

### TypeScript

- Use strict typing — avoid `any` where possible (it will trigger a lint warning).
- Prefer explicit interfaces and DTOs over inline type literals.
- Use `class-validator` decorators on all DTOs.
- Use `class-transformer` for serialization/deserialization.

### Formatting

Formatting is enforced via **Prettier**. The project config (`.prettierrc`):

```json
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

Run the formatter before committing:

```bash
npm run format
```

### Linting

ESLint is configured with `@typescript-eslint` and `eslint-plugin-import`. Run the linter with:

```bash
npm run lint
```

Key rules:
- No duplicate imports (`import/no-duplicates` is an error).
- Unused variables are flagged as warnings — clean them up before submitting a PR.
- Prettier violations are treated as errors.

### Architecture & Module Structure

Follow the existing layered structure inside each feature module:

```
src/<feature>/
  application/        # Use cases and mappers
  controllers/        # HTTP layer (NestJS controllers)
  domain/             # Entities, repository interfaces, domain exceptions
  dtos/               # Request/response DTOs with validation decorators
  entities/           # TypeORM persistence entities
  guards/             # Auth and rate-limit guards
  services/           # Business logic services
  strategies/         # Passport strategies
```

- Keep business logic in **services** and **use cases**, not in controllers.
- Define repository contracts in `domain/repositories/` and implement them in `infrastructure/repositories/`.
- Do not import across feature modules directly — use NestJS module exports/imports.

### Security

- Never log sensitive data (passwords, tokens, PII). See `SECURE_LOGGING.md`.
- Use parameterized queries — never build raw SQL strings.
- Validate and sanitize all incoming data via DTOs and `class-validator`.
- Follow the patterns in `SECURE_JWT_TOKENS.md` for token handling.

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

**Examples:**

```
feat(auth): add MFA support via TOTP
fix(jwt): handle token expiry edge case on refresh
docs(contributing): add PR process section
chore(deps): update @nestjs/common to v11
```

- Keep the summary under 72 characters.
- Use the imperative mood ("add", not "added" or "adds").
- Reference the issue number in the footer when applicable: `Closes #778`.

---

## Pull Request Process

1. **Create a branch** following the naming convention above.
2. **Make your changes** — keep PRs focused on a single concern.
3. **Run checks locally** before pushing:
   ```bash
   npm run lint
   npm run format
   npm run test
   npm run build
   ```
4. **Push your branch** and open a PR against `main` (or the target branch specified in the issue).
5. **Fill out the PR template** — include a clear description, what was changed, and how to test it.
6. **Link the related issue** in the PR description (e.g., `Closes #778`).
7. **Request a review** from at least one maintainer.
8. **Address review feedback** — push additional commits to the same branch; do not force-push after review has started.
9. **Squash and merge** is preferred for feature branches to keep the history clean.

### PR Checklist

Before marking your PR as ready for review, confirm:

- [ ] Code follows the project's style and architecture guidelines
- [ ] All new and existing tests pass (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] No circular dependencies (`npm run check:circular`)
- [ ] DTOs have proper validation decorators
- [ ] Sensitive data is not logged
- [ ] Swagger decorators are added/updated for any new or modified endpoints
- [ ] The PR description clearly explains the change and how to test it

See `PR_CHECKLIST.md` for the full checklist.

---

## Testing

- Write unit tests for all services and use cases.
- Write integration/e2e tests for controllers where appropriate.
- Test files live alongside the source file they test, using the `.spec.ts` suffix.
- Run the full test suite:
  ```bash
  npm run test
  ```
- Run with coverage:
  ```bash
  npm run test:cov
  ```
- Run contract tests:
  ```bash
  npm run test:contract
  ```

Aim to keep coverage meaningful — test behavior, not implementation details.

---

## Reporting Issues

When opening a GitHub issue, please include:

- A clear, descriptive title
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Relevant logs or screenshots
- Environment details (Node version, OS, etc.)

For security vulnerabilities, **do not open a public issue**. Contact the maintainers directly.

---

Thank you for contributing to StrellerMinds Backend! 🚀
