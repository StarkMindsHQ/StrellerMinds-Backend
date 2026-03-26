# Developer Onboarding Guide

Welcome to the **StrellerMinds-Backend** project! This guide will help you get your local development environment up and running quickly.

## Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v18.x or later)
- **NPM** (v8.x or later)
- **Docker & Docker Compose**
- **Git**
- **Postman** (Recommended for API testing)

---

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd StrellerMinds-Backend
   ```

2. **Setup environment variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   *Note: Populate the `.env` file with your local database and service credentials.*

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the infrastructure**:
   Launch dependencies (Postgres, Redis, Jaeger) using Docker:
   ```bash
   docker-compose up -d
   ```

5. **Run the application**:
   Start the NestJS application in watch mode:
   ```bash
   npm run start:dev
   ```

6. **Verify the installation**:
   Open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) to view the Swagger API documentation.

---

## Coding Standards

### 1. Typescript Best Practices
- **Strict Typing**: Always define types for function parameters, return values, and variables. Avoid `any`.
- **DTOs**: Use DTOs (`Data Transfer Objects`) for all API requests and responses.
- **Validation**: Every DTO must be decorated with `class-validator` rules.

### 2. NestJS Conventions
- **Modules**: Group related logic into modular components.
- **Dependency Injection**: Use constructor injection for services and repositories.
- **Decorators**: Use `@ApiProperty`, `@ApiOperation`, and `@ApiResponse` for all controller methods.

### 3. Git Workflow
- Create a feature branch for every task: `feature/issue-<number>-<description>`.
- Write descriptive commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) format.

---

## Useful Commands

| Action | Command |
| :--- | :--- |
| **Start Dev** | `npm run start:dev` |
| **Run Unit Tests** | `npm test` |
| **Run E2E Tests** | `npm run test:e2e` |
| **Generate Migration** | `npm run migration:generate --name=Name` |
| **Run Linting** | `npm run lint` |
| **Generate Specs** | `npm run docs:generate` |

## Onboarding Resources
- [Architecture Overview](../architecture/overview.md)
- [Module Interactions](../architecture/modules.md)
- [API Documentation](http://localhost:3000/api/docs)
