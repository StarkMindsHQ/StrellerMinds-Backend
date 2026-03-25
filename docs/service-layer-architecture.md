# Service Layer Architecture Documentation

## Overview

This document describes the service layer architecture implemented in the StrellerMinds backend application. The service layer provides a clean separation of concerns between controllers and data access layers, implementing proper business logic abstraction and dependency injection patterns.

## Architecture Principles

### 1. Separation of Concerns
- **Controllers**: Handle HTTP requests/responses, validation, and routing
- **Services**: Contain business logic, data transformation, and orchestration
- **Repositories**: Handle data access and persistence (via TypeORM)

### 2. Dependency Injection
- All services are injectable and managed by NestJS DI container
- Services depend on abstractions (interfaces) rather than concrete implementations
- Proper lifecycle management and testability

### 3. Interface-Based Design
- All services implement well-defined interfaces
- Enables easy mocking and testing
- Supports multiple implementations

## Core Components

### BaseService
```typescript
@Injectable()
export abstract class BaseService<T, ID> implements IBaseService<T, ID>
```

**Purpose**: Provides common functionality for all service implementations.

**Features**:
- Standard CRUD operations
- Validation framework
- Audit logging
- Transaction management integration
- Response formatting

**Key Methods**:
- `findById()`: Find entity by ID
- `findAll()`: Get all entities with optional filtering
- `create()`: Create new entity
- `update()`: Update existing entity
- `delete()`: Soft delete entity
- `validate()`: Business rule validation

### Service Interfaces

#### IBaseService<T, ID>
Defines the contract for all service implementations with standard CRUD operations.

#### IPaginatedResult<T>
Standardized pagination response structure.

#### IServiceResponse<T>
Standardized service response with metadata.

#### IValidationRule<T>
Business validation rule definition.

#### IAuditLog
Audit logging structure for tracking operations.

#### ITransactionManager
Transaction management interface for atomic operations.

## Service Implementation Examples

### UserService
```typescript
@Injectable()
export class UserService extends BaseService<User, string> implements IUserService
```

**Key Features**:
- User management with full CRUD operations
- Password hashing and validation
- Email/username uniqueness checks
- Activity logging
- Bulk operations
- GDPR data export

**Business Logic**:
- User registration with email verification
- Password change with history tracking
- Account suspension/reactivation
- Profile management
- Role and permission management

### AuthService
```typescript
@Injectable()
export class AuthService extends BaseService<User, string> implements IAuthService
```

**Key Features**:
- Authentication and authorization
- JWT token management
- Two-factor authentication
- Security audit logging
- Session management
- Password reset functionality

**Business Logic**:
- Login with rate limiting
- Token refresh mechanism
- 2FA setup and validation
- Security event logging
- Account lockout protection

## Dependency Injection Setup

### Module Configuration
```typescript
@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([Entity]),
  ],
  providers: [Service],
  exports: [Service],
})
export class FeatureModule {}
```

### Service Dependencies
Services can depend on:
- Repository instances (via `@InjectRepository`)
- Other services
- Configuration services
- External service clients

## Validation Framework

### Built-in Validation
Services implement validation rules through the `getValidationRules()` method:

```typescript
protected getValidationRules(operation: 'create' | 'update') {
  return [
    {
      field: 'email' as keyof any,
      rule: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Invalid email format',
    },
    // ... more rules
  ];
}
```

### Custom Validation
- Field-level validation rules
- Operation-specific validation (create vs update)
- Async validation support
- Custom error messages

## Transaction Management

### Automatic Transaction Handling
```typescript
@Injectable()
export class TransactionManager implements ITransactionManager {
  async executeInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    // Transaction implementation
  }
}
```

### Usage in Services
Services can use transactions for atomic operations:
```typescript
await this.transactionManager.executeInTransaction(async () => {
  // Multiple operations that must succeed or fail together
});
```

## Audit Logging

### Automatic Logging
Services automatically log important operations:
- Entity creation/update/deletion
- Authentication events
- Permission changes
- Data exports

### Audit Log Structure
```typescript
interface IAuditLog {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  timestamp: Date;
}
```

## Error Handling

### Standardized Error Responses
Services use NestJS built-in exceptions:
- `NotFoundException`: Resource not found
- `ConflictException`: Resource conflicts
- `BadRequestException`: Invalid input
- `UnauthorizedException`: Access denied

### Error Propagation
Errors are properly propagated through the service layer with appropriate HTTP status codes.

## Testing Strategy

### Unit Testing
- Mock repository dependencies
- Test business logic in isolation
- Validate error scenarios

### Integration Testing
- Test service interactions
- Database integration
- Transaction rollback testing

### Test Utilities
```typescript
// Example test setup
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });
});
```

## Best Practices

### 1. Service Design
- Keep services focused on single business domains
- Avoid business logic in controllers
- Use interfaces for all service contracts
- Implement proper error handling

### 2. Data Access
- Use repositories for data access
- Implement proper transaction boundaries
- Handle database errors gracefully
- Use soft deletes where appropriate

### 3. Validation
- Validate input at service layer
- Implement business rule validation
- Provide clear error messages
- Support both sync and async validation

### 4. Performance
- Use pagination for large datasets
- Implement caching where appropriate
- Optimize database queries
- Use connection pooling

### 5. Security
- Sanitize all inputs
- Implement proper authorization
- Log security events
- Use secure password handling

## Migration Guide

### For Existing Services
1. Extend `BaseService<T, ID>`
2. Implement appropriate interface
3. Move business logic from controllers
4. Add validation rules
5. Update dependency injection

### For New Services
1. Define service interface first
2. Extend `BaseService<T, ID>`
3. Implement required methods
4. Add validation rules
5. Configure module dependencies

## Conclusion

This service layer architecture provides a solid foundation for building maintainable, testable, and scalable backend applications. The separation of concerns, dependency injection, and interface-based design ensure that the codebase remains flexible and easy to extend.

The standardized patterns and utilities reduce boilerplate code while maintaining consistency across the application. Proper validation, transaction management, and audit logging ensure data integrity and security.
