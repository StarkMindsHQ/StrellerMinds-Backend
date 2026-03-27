# CQRS API Examples

## Overview

This document provides practical examples of how to use the CQRS implementation in the StrellerMinds Backend API.

## User Management APIs

### Create User (Command)
```http
POST /api/cqrs-users
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "username": "johndoe",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT",
    "status": "ACTIVE",
    "createdAt": "2026-03-27T09:15:00.000Z",
    "updatedAt": "2026-03-27T09:15:00.000Z"
  },
  "message": "User created successfully using CQRS pattern"
}
```

### Get User by ID (Query)
```http
GET /api/cqrs-users/uuid-here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT",
    "status": "ACTIVE",
    "createdAt": "2026-03-27T09:15:00.000Z",
    "updatedAt": "2026-03-27T09:15:00.000Z"
  },
  "message": "User retrieved successfully using CQRS pattern"
}
```

### Get User with Profile and Activity
```http
GET /api/cqrs-users/uuid-here
Content-Type: application/json

{
  "includeProfile": true,
  "includeActivity": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT",
    "status": "ACTIVE",
    "createdAt": "2026-03-27T09:15:00.000Z",
    "updatedAt": "2026-03-27T09:15:00.000Z",
    "profile": {
      "bio": "Software developer passionate about learning",
      "avatar": "https://example.com/avatar.jpg",
      "location": "San Francisco, CA"
    },
    "recentActivities": [
      {
        "id": "activity-uuid",
        "type": "COURSE_ENROLLMENT",
        "description": "Enrolled in 'Advanced TypeScript'",
        "createdAt": "2026-03-27T08:30:00.000Z"
      }
    ]
  },
  "message": "User retrieved successfully using CQRS pattern"
}
```

## Course Management APIs

### Create Course (Command)
```http
POST /api/cqrs-courses
Content-Type: application/json

{
  "title": "Introduction to CQRS",
  "description": "Learn the fundamentals of Command Query Responsibility Segregation",
  "instructorId": "instructor-uuid",
  "category": "Software Architecture",
  "level": "INTERMEDIATE",
  "duration": 120,
  "price": 99.99,
  "tags": ["CQRS", "Architecture", "Design Patterns"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "course-uuid",
    "title": "Introduction to CQRS",
    "description": "Learn the fundamentals of Command Query Responsibility Segregation",
    "instructorId": "instructor-uuid",
    "category": "Software Architecture",
    "level": "INTERMEDIATE",
    "duration": 120,
    "price": 99.99,
    "tags": ["CQRS", "Architecture", "Design Patterns"],
    "status": "DRAFT",
    "createdAt": "2026-03-27T09:20:00.000Z",
    "updatedAt": "2026-03-27T09:20:00.000Z"
  },
  "message": "Course created successfully using CQRS pattern"
}
```

## Event Sourcing Examples

### Event Stream for User
```http
GET /api/events/user/uuid-here
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "UserCreated",
      "aggregateId": "uuid-here",
      "version": 1,
      "timestamp": "2026-03-27T09:15:00.000Z",
      "data": {
        "userId": "uuid-here",
        "email": "john.doe@example.com",
        "username": "johndoe",
        "role": "STUDENT"
      }
    },
    {
      "type": "ProfileUpdated",
      "aggregateId": "uuid-here",
      "version": 2,
      "timestamp": "2026-03-27T09:18:00.000Z",
      "data": {
        "userId": "uuid-here",
        "bio": "Software developer passionate about learning",
        "avatar": "https://example.com/avatar.jpg"
      }
    }
  ]
}
```

### Events by Type
```http
GET /api/events/type/UserCreated?from=2026-03-27T00:00:00.000Z
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "UserCreated",
      "aggregateId": "uuid-here",
      "version": 1,
      "timestamp": "2026-03-27T09:15:00.000Z",
      "data": {
        "userId": "uuid-here",
        "email": "john.doe@example.com",
        "username": "johndoe",
        "role": "STUDENT"
      }
    }
  ]
}
```

## Read Model Queries

### User Statistics (Optimized Read Model)
```http
GET /api/read-models/user-stats/uuid-here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-here",
    "username": "johndoe",
    "role": "STUDENT",
    "loginCount": 15,
    "courseEnrollments": 3,
    "completedCourses": 1,
    "totalPoints": 250,
    "achievements": [
      "First Course Completed",
      "Active Learner"
    ],
    "lastLoginAt": "2026-03-27T08:45:00.000Z"
  }
}
```

## Error Handling

### Command Validation Error
```http
POST /api/cqrs-users
Content-Type: application/json

{
  "email": "invalid-email",
  "username": "",
  "password": "123"
}
```

**Response:**
```json
{
  "success": false,
  "error": "Validation failed: Email is invalid, Username is required, Password must be at least 8 characters",
  "timestamp": "2026-03-27T09:25:00.000Z"
}
```

### Query Not Found Error
```http
GET /api/cqrs-users/non-existent-uuid
```

**Response:**
```json
{
  "success": false,
  "error": "User with ID non-existent-uuid not found",
  "timestamp": "2026-03-27T09:26:00.000Z"
}
```

## Performance Monitoring

### Command Execution Metrics
```http
GET /api/metrics/commands
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCommands": 1250,
    "averageExecutionTime": "45ms",
    "successRate": 98.4,
    "errorRate": 1.6,
    "commandsByType": {
      "CreateUserCommand": 450,
      "CreateCourseCommand": 320,
      "UpdateUserProfileCommand": 280,
      "EnrollInCourseCommand": 200
    }
  }
}
```

### Query Performance Metrics
```http
GET /api/metrics/queries
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalQueries": 3450,
    "averageExecutionTime": "12ms",
    "cacheHitRate": 78.5,
    "queriesByType": {
      "GetUserByIdQuery": 1200,
      "GetUserStatsQuery": 800,
      "SearchCoursesQuery": 650,
      "GetCourseDetailsQuery": 800
    }
  }
}
```

## Batch Operations

### Bulk User Creation
```http
POST /api/cqrs-users/batch
Content-Type: application/json

{
  "users": [
    {
      "email": "user1@example.com",
      "username": "user1",
      "password": "password123",
      "role": "STUDENT"
    },
    {
      "email": "user2@example.com",
      "username": "user2",
      "password": "password456",
      "role": "INSTRUCTOR"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "userId": "user1-uuid",
        "email": "user1@example.com",
        "status": "created"
      },
      {
        "userId": "user2-uuid",
        "email": "user2@example.com",
        "status": "created"
      }
    ]
  },
  "message": "Batch user creation completed"
}
```

## Real-time Events

### WebSocket Event Subscription
```javascript
// Client-side WebSocket connection
const ws = new WebSocket('ws://localhost:3000/events');

ws.onopen = function() {
  // Subscribe to user events
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['user.created', 'user.updated', 'course.created']
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received event:', data);
  
  // Handle different event types
  switch(data.type) {
    case 'UserCreated':
      handleUserCreated(data);
      break;
    case 'CourseCreated':
      handleCourseCreated(data);
      break;
  }
};
```

## Testing Examples

### Unit Test for Command Handler
```typescript
describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let mockUserRepository: jest.Mocked<Repository<User>>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    mockUserRepository = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new CreateUserHandler(mockUserRepository, mockEventBus);
  });

  it('should create user successfully', async () => {
    const command = new CreateUserCommand({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123'
    });

    const result = await handler.handle(command);

    expect(result).toBeDefined();
    expect(result.email).toBe('test@example.com');
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UserCreated',
        data: expect.objectContaining({
          email: 'test@example.com'
        })
      })
    );
  });
});
```

### Integration Test for CQRS Flow
```typescript
describe('User CQRS Flow', () => {
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [CqrsModule, UserModule],
    }).compile();

    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  it('should create user and retrieve via CQRS', async () => {
    // Create user command
    const createCommand = new CreateUserCommand({
      email: 'integration@test.com',
      username: 'integrationuser',
      password: 'password123'
    });

    const createResult = await commandBus.execute(createCommand);
    expect(createResult.success).toBe(true);

    // Query user
    const query = new GetUserByIdQuery({
      userId: createResult.data.id
    });

    const queryResult = await queryBus.execute(query);
    expect(queryResult.success).toBe(true);
    expect(queryResult.data.email).toBe('integration@test.com');
  });
});
```

## Best Practices

### 1. Command Design
- Always validate input data
- Include all necessary data for execution
- Use descriptive command names

### 2. Query Optimization
- Use read models for complex queries
- Implement appropriate caching
- Consider pagination for large result sets

### 3. Error Handling
- Provide clear error messages
- Use appropriate HTTP status codes
- Log errors for debugging

### 4. Performance
- Monitor command and query execution times
- Use read models for frequently accessed data
- Implement caching where appropriate

### 5. Security
- Validate user permissions for commands
- Sanitize query parameters
- Implement rate limiting

This documentation provides comprehensive examples for using the CQRS implementation in the StrellerMinds Backend application.
