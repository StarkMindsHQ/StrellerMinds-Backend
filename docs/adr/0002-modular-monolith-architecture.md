# ADR 0002: Modular Monolith Architecture

## Status
Accepted

## Context
The project needs to support multiple domains (Users, Courses, Payments, Search, Analytics) while maintaining a high velocity of development. A microservices architecture would introduce excessive operational overhead and complexity at this stage, while a simple monolith would eventually become hard to maintain.

## Decision
We chose a **Modular Monolith** architecture using [NestJS Modules](https://docs.nestjs.com/modules).

Each domain is encapsulated in its own module (e.g., `CourseModule`, `AuthModule`, `UserModule`) with its own controllers, services, entities, and DTOs. Modules only communicate with each other through their public services, avoiding deep coupling between unrelated domains.

## Consequences
- **Positive**:
  - Easier to manage dependencies between domains.
  - Faster development and testing (no distributed trace required).
  - Clear ownership of domain logic.
  - Future possibility to extract a module into a microservice if scaling needs arise.
- **Negative**:
  - Requires discipline to avoid circular dependencies between modules.
  - If one module crashes, the entire application crashes (single process).
