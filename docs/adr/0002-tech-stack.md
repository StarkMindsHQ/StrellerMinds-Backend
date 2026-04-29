# ADR-002: Technology Stack: NestJS, TypeORM, PostgreSQL

* **Status**: Accepted
* **Date**: 2026-04-20
* **Deciders**: Engineering Team

## Context and Problem Statement

We need a robust, scalable, and type-safe backend stack for the StrellerMinds platform.

## Decision Drivers

* Developer Productivity: Fast development cycle.
* Scalability: Ability to handle increasing load.
* Ecosystem: Strong community support and libraries.
* Type Safety: Minimize runtime errors.

## Decision Outcome

Chosen option: "NestJS, TypeORM, and PostgreSQL".
- **NestJS**: Provides a modular and scalable framework with excellent TypeScript support.
- **TypeORM**: Offers a powerful Data Mapper pattern that fits well with Clean Architecture.
- **PostgreSQL**: A reliable, performant, and feature-rich relational database.

### Consequences

* **Good**: Strong typing, enterprise-grade architecture, reliable data persistence.
* **Bad**: TypeORM can be complex for very advanced queries compared to raw SQL or lighter libraries like Prisma.
