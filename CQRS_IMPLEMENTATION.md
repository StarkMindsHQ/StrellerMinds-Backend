# CQRS Pattern Implementation

## Overview

This document describes the implementation of the Command Query Responsibility Segregation (CQRS) pattern in the StrellerMinds Backend application. CQRS separates read and write operations to improve scalability, performance, and maintainability.

## Architecture

### Core Components

#### 1. Command Bus (`src/cqrs/bus/command-bus.service.ts`)
- Handles command processing and routing
- Executes command handlers
- Provides error handling and result formatting

#### 2. Query Bus (`src/cqrs/bus/query-bus.service.ts`)
- Handles query processing and routing
- Executes query handlers
- Optimized for read operations

#### 3. Event Bus (`src/cqrs/bus/event-bus.service.ts`)
- Publishes domain events
- Manages event handlers
- Supports asynchronous event processing

#### 4. Event Store (`src/cqrs/event-store/event-store.service.ts`)
- Persists domain events
- Provides event replay capabilities
- Supports event sourcing patterns

#### 5. Snapshot Service (`src/cqrs/snapshots/snapshot.service.ts`)
- Creates aggregate snapshots
- Improves performance for long event streams
- Manages snapshot lifecycle

### Interfaces

#### Command Interface (`src/cqrs/interfaces/command.interface.ts`)
```typescript
interface ICommand<T = any> {
  readonly data: T;
  readonly timestamp: Date;
  readonly id: string;
  readonly userId?: string;
}
```

#### Query Interface (`src/cqrs/interfaces/query.interface.ts`)
```typescript
interface IQuery<T = any> {
  readonly params: T;
  readonly timestamp: Date;
  readonly id: string;
}
```

#### Event Interface (`src/cqrs/interfaces/event.interface.ts`)
```typescript
interface IEvent<T = any> {
  readonly data: T;
  readonly type: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly metadata?: Record<string, any>;
}
```

## Implementation Examples

### User Domain

#### Command: Create User
```typescript
// Command
export class CreateUserCommand implements ICommand {
  readonly data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  // ... constructor and properties
}

// Handler
@Injectable()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  async handle(command: CreateUserCommand): Promise<User> {
    // Business logic for user creation
    // Event publishing
  }
}
```

#### Query: Get User by ID
```typescript
// Query
export class GetUserByIdQuery implements IQuery {
  readonly params: {
    userId: string;
    includeProfile?: boolean;
    includeActivity?: boolean;
  };
  // ... constructor and properties
}

// Handler
@Injectable()
@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  async handle(query: GetUserByIdQuery): Promise<any> {
    // Optimized read logic
  }
}
```

#### Event: User Created
```typescript
export class UserCreatedEvent implements IEvent {
  readonly data: {
    userId: string;
    email: string;
    username: string;
    role: string;
  };
  // ... constructor and properties
}

// Event Handler
@Injectable()
@EventHandler(UserCreatedEvent)
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent): Promise<void> {
    // Side effects: notifications, analytics, etc.
  }
}
```

## Read Models

### User Read Model (`src/cqrs/read-models/user-read-model.entity.ts`)
- Optimized for fast user queries
- Denormalized data structure
- Updated via event handlers

### Read Model Handler
```typescript
@Injectable()
@EventHandler(UserCreatedEvent)
export class UserReadModelHandler extends BaseReadModel<UserCreatedEvent> {
  async handle(event: UserCreatedEvent): Promise<void> {
    await this.updateReadModel(async () => {
      // Update read model based on event
    });
  }
}
```

## Aggregates

### Base Aggregate (`src/cqrs/aggregates/base-aggregate.ts`)
- Manages state and events
- Supports event sourcing
- Provides snapshot capabilities

### User Aggregate (`src/cqrs/aggregates/user.aggregate.ts`)
```typescript
export class UserAggregate extends BaseAggregate {
  // Aggregate properties
  
  public static create(data: UserData): UserAggregate {
    const user = new UserAggregate(data.email);
    const event = new UserCreatedEvent(/* ... */);
    user.applyEvent(event);
    return user;
  }
  
  protected when(event: IEvent): void {
    // Handle different event types
  }
}
```

## Database Schema

### Events Table
```sql
CREATE TABLE events (
  id VARCHAR PRIMARY KEY,
  aggregateId VARCHAR NOT NULL,
  eventType VARCHAR NOT NULL,
  eventData JSONB NOT NULL,
  version INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  userId VARCHAR,
  metadata JSONB
);
```

### Snapshots Table
```sql
CREATE TABLE snapshots (
  id VARCHAR PRIMARY KEY,
  aggregateId VARCHAR NOT NULL,
  aggregateType VARCHAR NOT NULL,
  data JSONB NOT NULL,
  version INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL
);
```

### User Read Model Table
```sql
CREATE TABLE user_read_model (
  userId VARCHAR PRIMARY KEY,
  email VARCHAR NOT NULL,
  username VARCHAR NOT NULL,
  firstName VARCHAR,
  lastName VARCHAR,
  role VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  loginCount INTEGER DEFAULT 0,
  lastLoginAt TIMESTAMP,
  courseEnrollments INTEGER DEFAULT 0,
  completedCourses INTEGER DEFAULT 0,
  totalPoints INTEGER DEFAULT 0,
  achievements JSONB,
  createdAt TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP NOT NULL
);
```

## Usage Examples

### Controller Usage
```typescript
@Controller('cqrs-users')
export class CqrsUserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async createUser(@Body() createUserDto: any) {
    const command = new CreateUserCommand(createUserDto);
    const result = await this.commandBus.execute(command);
    return result;
  }

  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    const query = new GetUserByIdQuery({ userId });
    const result = await this.queryBus.execute(query);
    return result;
  }
}
```

### Module Configuration
```typescript
@Module({
  imports: [CqrsModule],
  providers: [
    CreateUserHandler,
    GetUserByIdHandler,
    UserCreatedEventHandler,
    UserReadModelHandler,
  ],
})
export class UserModule {}
```

## Benefits

### 1. Scalability
- Separate read and write models can be scaled independently
- Read models can be optimized for specific query patterns
- Write operations are streamlined through commands

### 2. Performance
- Read models are optimized for fast queries
- Event sourcing enables efficient audit trails
- Snapshots improve performance for long-lived aggregates

### 3. Maintainability
- Clear separation of concerns
- Business logic is encapsulated in aggregates
- Event-driven architecture enables loose coupling

### 4. Flexibility
- Multiple read models for different use cases
- Easy to add new event handlers
- Supports eventual consistency patterns

## Best Practices

### 1. Command Design
- Commands should be immutable
- Include all necessary data for execution
- Validate commands before processing

### 2. Event Design
- Events should represent facts about what happened
- Use past tense for event names (UserCreated, OrderPlaced)
- Include all relevant data in events

### 3. Query Design
- Queries should be optimized for specific use cases
- Use read models for complex queries
- Consider caching for frequently accessed data

### 4. Error Handling
- Implement proper error handling in handlers
- Use consistent error response format
- Log errors appropriately

### 5. Testing
- Unit test command and query handlers
- Test event handlers independently
- Integration test the complete CQRS flow

## Migration Strategy

### Phase 1: Setup CQRS Infrastructure
- Implement core CQRS components
- Create base classes and interfaces
- Set up event store and read models

### Phase 2: Migrate Critical Operations
- Start with high-traffic operations
- Implement commands, queries, and events
- Keep existing services running in parallel

### Phase 3: Optimize and Extend
- Add more read models as needed
- Implement snapshots for performance
- Add monitoring and metrics

### Phase 4: Full Migration
- Decommission old services
- Optimize performance based on usage patterns
- Document best practices

## Monitoring and Metrics

### Key Metrics to Track
- Command execution time
- Query performance
- Event processing lag
- Read model synchronization delay

### Logging
- Log all commands and queries
- Track event publishing and handling
- Monitor aggregate state changes

## Security Considerations

### Command Authorization
- Validate user permissions for commands
- Audit command execution
- Implement rate limiting

### Query Security
- Implement proper access controls for queries
- Sanitize query parameters
- Protect sensitive read model data

## Conclusion

The CQRS implementation provides a robust foundation for scalable and maintainable application architecture. By separating read and write operations, we can optimize each side independently and implement sophisticated event-driven patterns.

The implementation follows best practices and provides a solid foundation for future enhancements. The modular design allows for easy extension and modification as requirements evolve.
