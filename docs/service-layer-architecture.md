# Service Layer Architecture Documentation

## Overview

This document describes the refactored service layer architecture for the StrellerMinds Backend project. The refactoring addresses the original issues of mixed responsibilities, tight coupling, and difficult testing by implementing clean architecture principles and dependency injection patterns.

## Architecture Principles

### 1. Single Responsibility Principle (SRP)

Each service now has a single, well-defined responsibility:

- **BaseService**: Provides common CRUD operations and error handling
- **SharedUtilityService**: Handles common utilities like validation and data transformation
- **DependencyInjectionService**: Manages service dependencies and resolution
- **Domain Services**: Handle specific business logic for their domain

### 2. Dependency Injection

Services use proper dependency injection through NestJS's DI container:

- Constructor injection for required dependencies
- Interface-based contracts for loose coupling
- Lazy loading for circular dependency resolution

### 3. Separation of Concerns

Business logic is separated from:

- Data access (handled by repositories)
- Cross-cutting concerns (handled by shared services)
- Infrastructure concerns (handled by dedicated services)

## Service Structure

### Base Service (`BaseService<T>`)

The `BaseService` class provides common functionality for all CRUD operations:

```typescript
export abstract class BaseService<T> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly repository: Repository<T>) {}

  protected async createEntity(data: Partial<T>): Promise<T>;
  protected async findEntityById(id: string, relations?: string[]): Promise<T>;
  protected async findEntitiesWithPagination(
    options: FindManyOptions<T> & PaginationOptions,
  ): Promise<PaginatedResult<T>>;
  protected async updateEntity(id: string, data: Partial<T>): Promise<T>;
  protected async deleteEntity(id: string): Promise<void>;
  protected async entityExists(where: FindOptionsWhere<T>): Promise<boolean>;
  protected handleError(error: any, operation: string, context?: string): never;
}
```

**Usage Example:**

```typescript
@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sharedUtilityService: SharedUtilityService,
  ) {
    super(userRepository);
  }

  public async create(createUserDto: CreateUserDto): Promise<User> {
    // Custom business logic
    const sanitizedData = this.sharedUtilityService.sanitizeInput(createUserDto);
    return await this.createEntity(sanitizedData);
  }
}
```

### Shared Utility Service (`SharedUtilityService`)

Provides common utilities used across services:

```typescript
@Injectable()
export class SharedUtilityService {
  isValidEmail(email: string): boolean;
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] };
  sanitizeInput(input: string): string;
  formatDate(date: Date): string;
  parseDate(dateInput: string | Date | number): Date;
  deepClone<T>(obj: T): T;
  deepMerge<T>(target: T, source: Partial<T>): T;
  toCamelCase(obj: Record<string, any>): Record<string, any>;
  toSnakeCase(obj: Record<string, any>): Record<string, any>;
  isEmpty(obj: any): boolean;
  removeEmptyValues<T>(obj: T): Partial<T>;
}
```

**Usage Example:**

```typescript
// In any service
constructor(private readonly sharedUtilityService: SharedUtilityService) {}

async createUser(userData: CreateUserDto) {
  if (!this.sharedUtilityService.isValidEmail(userData.email)) {
    throw new ConflictException('Invalid email format');
  }

  const sanitizedData = this.sharedUtilityService.sanitizeInput(userData);
  // ... rest of the logic
}
```

### Service Interfaces

Define contracts for different types of services:

```typescript
// CRUD operations
export interface ICrudService<T, CreateDto, UpdateDto> {
  create(createDto: CreateDto): Promise<T>;
  findAll(options?: PaginationOptions): Promise<PaginatedResult<T>>;
  findOne(id: string, relations?: string[]): Promise<T>;
  update(id: string, updateDto: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
}

// User-specific operations
export interface IUserService<T> extends ICrudService<T, any, any>, ISearchableService<T> {
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  updateRefreshToken(userId: string, refreshToken: string | null): Promise<void>;
  validateCredentials(email: string, password: string): Promise<boolean>;
}
```

**Implementation Example:**

```typescript
@Injectable()
export class UsersService extends BaseService<User> implements IUserService<User> {
  // Must implement all interface methods
  async validateCredentials(email: string, password: string): Promise<boolean> {
    // Implementation
  }
}
```

### Dependency Injection Service (`DependencyInjectionService`)

Manages service dependencies and provides advanced DI features:

```typescript
@Injectable()
export class DependencyInjectionService {
  async getService<T>(serviceType: Type<T>): Promise<T>;
  async getServiceByToken<T>(token: string | symbol): Promise<T>;
  async isServiceAvailable(serviceType: Type<any>): Promise<boolean>;
  createLazyService<T>(serviceType: Type<T>): () => Promise<T>;
  createServiceFactory<T>(serviceType: Type<T>, condition: () => boolean): () => Promise<T | null>;
  async validateServiceDependencies(
    serviceType: Type<any>,
  ): Promise<{ isValid: boolean; missingDependencies: string[]; errors: string[] }>;
}
```

## Error Handling

### Consistent Error Handling

All services use the `handleError` method from `BaseService`:

```typescript
try {
  // Service logic
} catch (error) {
  if (error instanceof NotFoundException) throw error;
  return this.handleError(error, 'operation name', 'context');
}
```

### Error Types

- **NotFoundException**: When requested resource doesn't exist
- **ConflictException**: When there's a business rule violation
- **InternalServerErrorException**: For unexpected errors (with logging)

## Testing

### Improved Testability

Services are now easier to test due to:

- Clear interfaces and contracts
- Dependency injection
- Separated concerns
- Mockable dependencies

**Test Example:**

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: jest.Mocked<Repository<User>>;
  let mockSharedUtilityService: jest.Mocked<SharedUtilityService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: SharedUtilityService,
          useValue: createMockSharedUtilityService(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    mockRepository = module.get(getRepositoryToken(User));
    mockSharedUtilityService = module.get(SharedUtilityService);
  });

  it('should create a user with valid data', async () => {
    // Test implementation
  });
});
```

## Migration Guide

### From Old Service Pattern

**Before:**

```typescript
@Injectable()
export class OldUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(userData: CreateUserDto): Promise<User> {
    // Mixed responsibilities: user creation, email sending, file upload
    const user = await this.userRepository.save(userData);
    await this.emailService.sendWelcomeEmail(user);
    if (userData.profileImage) {
      await this.cloudinaryService.uploadImage(userData.profileImage);
    }
    return user;
  }
}
```

**After:**

```typescript
@Injectable()
export class UsersService extends BaseService<User> implements IUserService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sharedUtilityService: SharedUtilityService,
  ) {
    super(userRepository);
  }

  async create(userData: CreateUserDto): Promise<User> {
    // Single responsibility: user creation only
    const sanitizedData = this.sharedUtilityService.sanitizeInput(userData);
    const user = await this.createEntity(sanitizedData);

    // Emit event for other services to handle
    this.eventEmitter.emit('user.created', { user, userData });
    return user;
  }
}

// Separate service for email handling
@Injectable()
export class UserNotificationService {
  constructor(private readonly emailService: EmailService) {}

  @OnEvent('user.created')
  async handleUserCreated(payload: { user: User; userData: CreateUserDto }) {
    await this.emailService.sendWelcomeEmail(payload.user);
  }
}
```

## Best Practices

### 1. Service Design

- Extend `BaseService` for CRUD operations
- Implement appropriate interfaces
- Use dependency injection for all dependencies
- Keep services focused on single responsibility

### 2. Error Handling

- Use `handleError` method for consistent error handling
- Log errors with appropriate context
- Re-throw specific exceptions when appropriate
- Provide meaningful error messages

### 3. Data Validation

- Use `SharedUtilityService` for common validations
- Validate input data before processing
- Sanitize user inputs to prevent injection attacks
- Use DTOs for data transfer

### 4. Testing

- Mock dependencies using interfaces
- Test error scenarios
- Use test factories for common test data
- Test service contracts, not implementations

### 5. Performance

- Use pagination for large datasets
- Implement caching where appropriate
- Use events for asynchronous operations
- Avoid blocking operations in services

## Common Patterns

### Event-Driven Architecture

```typescript
// Emit events for cross-cutting concerns
this.eventEmitter.emit('course.enrollment.created', { courseId, userId });

// Handle events in dedicated services
@OnEvent('course.enrollment.created')
async handleEnrollmentCreated(payload: { courseId: string; userId: string }) {
  // Handle enrollment logic
}
```

### Lazy Loading

```typescript
// Resolve circular dependencies
const lazyEmailService = this.diService.createLazyService(EmailService);
const emailService = await lazyEmailService();
```

### Service Factory

```typescript
// Conditional service creation
const conditionalService = this.diService.createServiceFactory(PaymentService, () =>
  this.configService.get('PAYMENT_ENABLED'),
);
```

## Monitoring and Debugging

### Service Health Checks

```typescript
// Validate service dependencies
const health = await this.diService.validateServiceDependencies(UsersService);
if (!health.isValid) {
  this.logger.error(`Service dependencies invalid: ${health.errors.join(', ')}`);
}
```

### Cache Management

```typescript
// Monitor service cache
const cacheStats = this.diService.getCacheStats();
this.logger.debug(`Service cache: ${cacheStats.size} entries`);
```

## Future Enhancements

### Planned Improvements

1. **Service Registry**: Centralized service discovery and management
2. **Circuit Breaker**: Fault tolerance for external service calls
3. **Metrics Collection**: Service performance and usage metrics
4. **Auto-scaling**: Dynamic service instance management
5. **Service Mesh**: Advanced service-to-service communication

### Extension Points

- Custom base services for specific domains
- Additional utility services for common patterns
- Service middleware for cross-cutting concerns
- Advanced dependency resolution strategies

## Conclusion

The refactored service layer architecture provides:

- **Maintainability**: Clear separation of concerns and single responsibilities
- **Testability**: Easy mocking and testing through interfaces and DI
- **Scalability**: Event-driven architecture and loose coupling
- **Consistency**: Standardized patterns and error handling
- **Extensibility**: Easy to add new services and functionality

This architecture follows NestJS best practices and provides a solid foundation for future development and maintenance.
