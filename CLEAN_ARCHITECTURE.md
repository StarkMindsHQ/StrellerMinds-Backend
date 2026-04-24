# Clean Architecture Implementation Guide

## Overview

This project implements **Clean Architecture** principles as outlined by Robert C. Martin (Uncle Bob). The architecture separates concerns into distinct layers to improve testability, maintainability, and independence from frameworks.

## Architecture Layers

### 1. Domain Layer (`domain/`)

The innermost layer containing all pure business logic. This layer is completely independent of any framework or external concerns.

**Components:**
- **Entities** (`domain/entities/`): Core business objects representing the domain model
  - Extend `DomainEntity` base class
  - Contain only business logic with no database dependencies
  - Example: `User`, `Course`, `RefreshToken`

- **Repository Interfaces** (`domain/repositories/`): Contracts for data access
  - Define what data operations are available
  - Extend `IRepository<T>` generic interface
  - Example: `IUserRepository`, `ICourseRepository`

- **Exceptions** (`domain/exceptions/`): Domain-specific exceptions
  - Extend `DomainException` base class
  - Represent business rule violations
  - Examples: `UserAlreadyExistsException`, `InvalidCredentialsException`

- **Value Objects** (`domain/value-objects/`): Immutable value objects
  - Extend `ValueObject<T>` base class
  - Identified by their attributes, not by ID
  - Examples: `Email`, `Password`, `Money`

**Key Principles:**
- 🚫 No framework imports (NestJS, TypeORM, etc.)
- ✅ Independent and testable
- ✅ Contains all business rules

### 2. Application Layer (`application/`)

Orchestrates the domain layer and defines the use cases (business flows). This layer depends on the domain layer.

**Components:**
- **Use Cases** (`application/use-cases/`): Application services coordinating domain logic
  - Extend `UseCase<Request, Response>` base class
  - Handle specific business operations
  - Examples: `LoginUseCase`, `RegisterUseCase`, `ListCoursesUseCase`

- **DTOs** (`application/dtos/`): Data Transfer Objects for input/output
  - Request DTOs: Input to use cases
  - Response DTOs: Output from use cases
  - Provide contract between layers

- **Mappers** (`application/mappers/`): Convert between domain and infrastructure representations
  - Extend `Mapper<Entity, DTO>` base class
  - Handle transformations:
    - Domain Entity → DTO (for API responses)
    - Persistence Entity → Domain Entity (from database)
    - Domain Entity → Persistence Entity (to database)

**Key Principles:**
- ✅ Orchestrates domain logic
- ✅ Framework-specific code is minimal
- ✅ Depends only on domain and self

### 3. Infrastructure Layer (`infrastructure/`)

Handles technical implementation details and external concerns. This is the outermost layer depending on all inner layers.

**Components:**
- **Repository Implementations** (`infrastructure/repositories/`): Concrete implementations of domain repository interfaces
  - Use TypeORM or other ORM
  - Implement all query methods defined in domain interface
  - Example: `UserRepositoryImpl`, `CourseRepositoryImpl`

- **Persistence Entities** (`infrastructure/persistence/`): ORM-specific entity definitions
  - Different from domain entities
  - Only concern is database representation
  - Contains TypeORM decorators
  - Example: `UserPersistenceEntity`, `CoursePersistenceEntity`

**Key Principles:**
- ✅ Contains all framework-specific code
- ✅ Easy to replace (e.g., swap database)
- ✅ Depends on all inner layers

## Project Structure

```
src/
├── shared/                          # Shared across all modules
│   ├── domain/
│   │   ├── entities/
│   │   │   └── domain-entity.base.ts
│   │   ├── repositories/
│   │   │   └── repository.interface.ts
│   │   ├── exceptions/
│   │   │   └── domain-exceptions.ts
│   │   └── value-objects/
│   │       └── value-object.base.ts
│   └── application/
│       ├── use-case.base.ts
│       └── mappers/
│           └── mapper.base.ts
│
├── auth/                            # Auth Module
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   └── refresh-token.entity.ts
│   │   ├── repositories/
│   │   │   ├── user-repository.interface.ts
│   │   │   └── refresh-token-repository.interface.ts
│   │   └── exceptions/
│   │       └── auth-exceptions.ts
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── login.use-case.ts
│   │   │   └── register.use-case.ts
│   │   └── mappers/
│   │       └── user.mapper.ts
│   └── infrastructure/
│       ├── repositories/
│       │   ├── user-repository.impl.ts
│       │   └── refresh-token-repository.impl.ts
│       └── persistence/
│           ├── user-persistence.entity.ts
│           └── refresh-token-persistence.entity.ts
│
├── course/                          # Course Module
│   ├── domain/
│   │   ├── entities/
│   │   │   └── course.entity.ts
│   │   ├── repositories/
│   │   │   └── course-repository.interface.ts
│   │   └── exceptions/
│   │       └── course-exceptions.ts
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── get-course.use-case.ts
│   │   │   └── list-courses.use-case.ts
│   │   └── mappers/
│   │       └── course.mapper.ts
│   └── infrastructure/
│       ├── repositories/
│       │   └── course-repository.impl.ts
│       └── persistence/
│           └── course-persistence.entity.ts
│
└── user/                            # User Module (similar structure)
    ├── domain/
    ├── application/
    └── infrastructure/
```

## Dependency Rules

The fundamental rule of Clean Architecture:

```
Domain Layer (innermost)
    ↑ depends on
Application Layer
    ↑ depends on
Infrastructure Layer (outermost)
```

**Important:** Each layer ONLY depends on inner layers, never on outer layers!

## Creating a New Feature

### 1. Define Domain (Domain Layer)

```typescript
// domain/entities/user.entity.ts
export class User extends DomainEntity<UserPrimitives> {
  // Pure business logic only
}

// domain/repositories/user-repository.interface.ts
export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
}

// domain/exceptions/user-exceptions.ts
export class UserNotFoundException extends DomainException {}
```

### 2. Create Use Cases (Application Layer)

```typescript
// application/use-cases/get-user.use-case.ts
@Injectable()
export class GetUserUseCase extends UseCase<GetUserRequest, GetUserResponse> {
  constructor(private readonly userRepository: IUserRepository) {
    super();
  }

  async execute(request: GetUserRequest): Promise<GetUserResponse> {
    const user = await this.userRepository.findById(request.userId);
    if (!user) throw new UserNotFoundException(request.userId);
    // Transform and return
  }
}
```

### 3. Implement Infrastructure (Infrastructure Layer)

```typescript
// infrastructure/repositories/user-repository.impl.ts
@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(UserPersistenceEntity)
    private readonly typeOrmRepository: Repository<UserPersistenceEntity>,
    private readonly userMapper: UserMapper,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.typeOrmRepository.findOne({ where: { id } });
    return entity ? this.userMapper.toDomain(entity) : null;
  }
}
```

### 4. Wire in Controller (Presentation Layer)

```typescript
// controllers/user.controller.ts
@Controller('users')
export class UserController {
  constructor(private readonly getUserUseCase: GetUserUseCase) {}

  @Get(':id')
  async getUser(@Param('id') userId: string) {
    const result = await this.getUserUseCase.execute(new GetUserRequest(userId));
    return result;
  }
}
```

## Best Practices

### ✅ DO

- Keep domain entities free of dependencies
- Use interfaces for repository contracts
- Map domain entities to DTOs in application layer
- Inject dependencies through constructors
- Make domain exceptions descriptive
- Use value objects for complex domain concepts

### ❌ DON'T

- Import NestJS decorators in domain layer
- Use TypeORM in domain entities
- Access database directly from use cases
- Mix domain and infrastructure concerns
- Use persistence entities in controllers
- Return persistence entities directly

## Testing

Clean Architecture makes testing straightforward:

```typescript
// Domain layer - no dependencies needed
describe('User Entity', () => {
  it('should create user', () => {
    const user = new User('1', 'test@example.com', ...);
    expect(user.getEmail()).toBe('test@example.com');
  });
});

// Use case - mock repository
describe('GetUserUseCase', () => {
  it('should retrieve user', async () => {
    const mockRepository = {
      findById: jest.fn().mockResolvedValue(mockUser),
    };
    const useCase = new GetUserUseCase(mockRepository as any);
    const result = await useCase.execute(new GetUserRequest('1'));
    expect(result.email).toBe('test@example.com');
  });
});
```

## Migration from Old Architecture

For existing code:

1. **Identify domain models** - Extract business logic from services
2. **Create domain entities** - Make immutable, business-logic focused
3. **Define repository interfaces** - From domain perspective
4. **Extract use cases** - From existing services
5. **Implement repositories** - Wrap existing ORM code
6. **Update controllers** - Inject and call use cases
7. **Gradually refactor** - Move remaining logic into layers

## References

- [Uncle Bob's Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Clean Architecture Handbook](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164)
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)
