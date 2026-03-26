# ADR 0003: PostgreSQL as Primary Database with TypeORM

## Status
Accepted

## Context
The project requires complex data relations between users, courses, payments, and forum posts. Data integrity and the ability to perform ACID-compliant transactions are critical, especially for the `PaymentModule` and `UserModule`.

## Decision
We chose **PostgreSQL** as the primary relational database and **TypeORM** for object-relational mapping.

### Rationale
- **PostgreSQL**: Industry standard, supports JSONB for semi-structured data, high reliability, and strong support for geospatial data (if needed).
- **TypeORM**: Mature ORM with strong TypeScript support, automatic migrations, and clear entity definitions.

## Consequences
- **Positive**:
  - Strongly typed data models.
  - Automatic migration handling for schema updates.
  - Mature ecosystem of drivers and tools.
- **Negative**:
  - Complex queries may require manually written SQL (use of `QueryBuilder`).
  - ORM performance overhead compared to raw SQL queries.
