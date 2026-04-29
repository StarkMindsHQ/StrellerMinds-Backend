# ADR-001: Adopt Clean Architecture

* **Status**: Accepted
* **Date**: 2026-04-20
* **Deciders**: Engineering Team

## Context and Problem Statement

As the StrellerMinds Backend grows, we need a way to ensure that business logic remains decoupled from technical implementation details (frameworks, databases, etc.). Traditional "Fat Service" patterns in NestJS often lead to code that is hard to test and maintain.

## Decision Drivers

* Maintainability: Business logic should be easy to find and change.
* Testability: We should be able to test business rules without infrastructure.
* Independence: The core domain should not depend on external libraries like TypeORM or NestJS.

## Considered Options

1. **Layered Architecture (Controller -> Service -> Repository)**: Standard NestJS approach.
2. **Clean Architecture (Domain -> Application -> Infrastructure)**: Decoupled layers with inversion of control.

## Decision Outcome

Chosen option: "Clean Architecture", because it provides the strictest separation of concerns and ensures the long-term health of the codebase by protecting the domain logic.

### Consequences

* **Good**: Highly testable code, clear boundaries, easy to swap infrastructure components.
* **Bad**: Increased boilerplate (Mappers, DTOs, interfaces), steeper learning curve for new developers.
