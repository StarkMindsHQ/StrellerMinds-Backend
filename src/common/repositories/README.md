# Repository Pattern Implementation

This document describes the repository pattern implementation for the StrellerMinds-Backend project.

## Overview

The repository pattern provides an abstraction layer between the business logic and the data access layer. This implementation includes:

- **Repository Interfaces**: Define contracts for data access operations
- **Base Repository**: Provides common CRUD operations
- **Custom Repositories**: Entity-specific repositories with business logic
- **Unit of Work Pattern**: Manages transactions and consistency
- **Repository Decorators**: Provide caching, transactions, and other cross-cutting concerns
- **Repository Factory**: Creates and manages repository instances

## Architecture

### Core Components

#### 1. Repository Interfaces (`src/common/repositories/interfaces/`)

- `IRepository<T>`: Main repository interface with CRUD operations
- `IBaseRepository<T>`: Basic repository operations
- `IUnitOfWork`: Unit of work interface for transaction management
- `IRepositoryFactory`: Factory interface for creating repositories

#### 2. Base Repository (`src/common/repositories/base/`)

- `BaseRepository<T>`: Abstract base class implementing common operations
- Provides pagination, cursor-based pagination, and basic CRUD operations
- Extensible for custom repository implementations

#### 3. Unit of Work (`src/common/repositories/unit-of-work/`)

- `UnitOfWork`: Transaction management implementation
- Supports nested transactions and rollback
- Integrates with TypeORM's EntityManager

#### 4. Repository Decorators (`src/common/repositories/decorators/`)

- `@Repository`: Marks a class as a repository with configuration options
- `@InjectRepository`: Dependency injection decorator for repositories
- `@Transactional`: Marks methods as transactional
- `@Cacheable`: Caches method results
- `@CacheInvalidate`: Invalidates cache after method execution

#### 5. Repository Implementations (`src/common/repositories/implementations/`)

- `UserRepository`: User-specific repository with advanced queries
- `UserActivityRepository`: User activity tracking repository
- Additional repositories can be added as needed

#### 6. Repository Factory (`src/common/repositories/factory/`)

- `RepositoryFactory`: Creates and manages repository instances
- Supports both generic and custom repositories
- Handles dependency injection and configuration

## Usage

### Setting up the Repository Module

```typescript
// app.module.ts
import { RepositoryModule } from './common/repositories/repository.module';
import { User } from './user/entities/user.entity';
import { UserRepository } from './common/repositories/implementations/user.repository';

@Module({
  imports: [
    RepositoryModule.forRoot(),
    RepositoryModule.forEntities([User]),
    RepositoryModule.forCustomRepositories([UserRepository]),
  ],
})
export class AppModule {}
```

### Using Repositories in Services

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../common/repositories/implementations/user.repository';
import { UnitOfWork } from '../common/repositories/unit-of-work/unit-of-work';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    return await this.unitOfWork.withTransaction(async (manager) => {
      const user = this.userRepository.create(userData);
      return await this.userRepository.save(user);
    });
  }

  async findActiveUsers(): Promise<User[]> {
    return await this.userRepository.findActiveUsers();
  }
}
```

### Creating Custom Repositories

```typescript
// custom.repository.ts
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base/base.repository';
import { Repository, Cacheable, Transactional } from '../decorators/repository.decorators';
import { MyEntity } from '../entities/my-entity.entity';

export interface IMyRepository extends Repository<MyEntity> {
  findByCustomCriteria(criteria: any): Promise<MyEntity[]>;
}

@Injectable()
@Repository({ entity: MyEntity, cacheable: true, cacheDuration: 300 })
export class MyRepository extends BaseRepository<MyEntity> implements IMyRepository {
  @Cacheable(600)
  async findByCustomCriteria(criteria: any): Promise<MyEntity[]> {
    const qb = this.createQueryBuilder('entity');
    // Custom query logic
    return qb.where('entity.customField = :criteria', { criteria }).getMany();
  }

  @Transactional()
  @CacheInvalidate('MyRepository:*')
  async updateWithTransaction(id: string, data: any): Promise<MyEntity> {
    await this.update(id, data);
    return this.findOneById(id);
  }
}
```

## Features

### 1. Pagination Support

```typescript
// Offset-based pagination
const result = await userRepository.findWithPagination(1, 20, {
  where: { status: UserStatus.ACTIVE },
});

// Cursor-based pagination
const result = await userRepository.findWithCursorPagination(cursor, 20, {
  status: UserStatus.ACTIVE,
});
```

### 2. Caching

```typescript
@Cacheable(300) // Cache for 5 minutes
async findByEmail(email: string): Promise<User | null> {
  return this.findOne({ where: { email } });
}

@CacheInvalidate('UserRepository:*')
async updateUser(id: string, data: any): Promise<User> {
  // Cache will be invalidated after this method
}
```

### 3. Transactions

```typescript
@Transactional()
async transferFunds(fromId: string, toId: string, amount: number): Promise<void> {
  await this.update(fromId, { balance: () => `balance - ${amount}` });
  await this.update(toId, { balance: () => `balance + ${amount}` });
}

// Manual transaction management
await this.unitOfWork.withTransaction(async (manager) => {
  // Multiple operations in a single transaction
});
```

### 4. Soft Deletes

```typescript
// Soft delete
await userRepository.softDeleteUser(id, deletedBy);

// Restore soft deleted entity
await userRepository.restoreUser(id);
```

### 5. Advanced Queries

```typescript
// Complex filtering
const users = await userRepository.findUsersWithPaginationAndFilters(1, 20, {
  search: 'john',
  status: UserStatus.ACTIVE,
  role: UserRole.USER,
  createdAfter: new Date('2023-01-01'),
  sortBy: 'createdAt',
  sortOrder: 'DESC',
});

// Analytics queries
const stats = await userActivityRepository.getActivityStats(userId, 30);
```

## Migration Guide

### From Direct TypeORM Usage

**Before:**
```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }
}
```

**After:**
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }
}
```

### Benefits of Migration

1. **Separation of Concerns**: Business logic separated from data access logic
2. **Testability**: Easier to mock and test repositories
3. **Consistency**: Standardized data access patterns
4. **Caching**: Built-in caching support
5. **Transactions**: Simplified transaction management
6. **Type Safety**: Better TypeScript support with custom repository interfaces

## Best Practices

1. **Keep repositories focused**: Each repository should handle one entity type
2. **Use appropriate caching**: Cache frequently accessed read operations
3. **Transaction boundaries**: Use `@Transactional` for operations that modify data
4. **Error handling**: Implement proper error handling in repositories
5. **Query optimization**: Use query builders for complex queries
6. **Testing**: Mock repositories in unit tests

## Performance Considerations

1. **Cache invalidation**: Be strategic about cache invalidation patterns
2. **Query optimization**: Use query builders for complex queries
3. **Connection pooling**: Ensure proper database connection configuration
4. **Batch operations**: Use bulk operations where possible
5. **Lazy loading**: Configure relationships appropriately

## Future Enhancements

1. **Read/Write separation**: Support for different database connections
2. **Distributed transactions**: Support for multiple database transactions
3. **Event sourcing**: Integration with event-driven architecture
4. **Query caching**: Automatic query result caching
5. **Repository composition**: Support for composite repositories

## Testing

Repository pattern makes testing easier:

```typescript
// Mock repository for testing
const mockUserRepository = {
  findByEmail: jest.fn(),
  save: jest.fn(),
  findActiveUsers: jest.fn(),
};

// Test service with mocked repository
const userService = new UserService(mockUserRepository as any, mockUnitOfWork);
```

This implementation provides a solid foundation for data access operations while maintaining flexibility and testability.
