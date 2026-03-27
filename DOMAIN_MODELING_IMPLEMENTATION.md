# Domain Modeling Implementation

This document describes the domain-driven design (DDD) implementation for the StrellerMinds Backend application.

## Overview

The domain modeling implementation addresses the issue of insufficient domain modeling by introducing:

1. **Rich Domain Models** - Entities with encapsulated business logic
2. **Value Objects** - Immutable objects with no identity
3. **Domain Events** - Events that capture significant business occurrences
4. **Domain Services** - Services for complex business logic that doesn't naturally fit in entities
5. **Aggregates** - Clusters of domain objects treated as a single unit

## Architecture

### Core Domain Components

#### 1. Value Objects

Value objects are immutable objects that are defined by their attributes rather than their identity.

##### Email Value Object
- **Location**: `src/common/domain/value-objects/email.value-object.ts`
- **Purpose**: Encapsulates email validation and normalization
- **Features**:
  - Email format validation
  - Automatic lowercase conversion
  - Trim whitespace
  - Equality comparison

##### Money Value Object
- **Location**: `src/common/domain/value-objects/money.value-object.ts`
- **Purpose**: Handles monetary values with proper currency support
- **Features**:
  - Currency validation
  - Arithmetic operations (add, subtract, multiply)
  - Currency consistency checks
  - Precision handling

##### Username Value Object
- **Location**: `src/common/domain/value-objects/username.value-object.ts`
- **Purpose**: Encapsulates username validation rules
- **Features**:
  - Length validation (3-30 characters)
  - Character validation (alphanumeric, underscore, hyphen)
  - Normalization to lowercase

##### Password Value Object
- **Location**: `src/common/domain/value-objects/password.value-object.ts`
- **Purpose**: Secure password handling with validation
- **Features**:
  - Password strength validation
  - Secure hashing
  - Password verification
  - Hash storage

#### 2. Domain Events

Domain events capture significant business occurrences that can trigger side effects.

##### Base Domain Event
- **Location**: `src/common/domain/events/domain-event.base.ts`
- **Purpose**: Base class for all domain events
- **Features**:
  - Timestamp tracking
  - Aggregate ID association

##### User Domain Events
- **Location**: `src/common/domain/events/user.domain-events.ts`
- **Events**:
  - `UserRegisteredEvent` - Fired when a new user registers
  - `UserPasswordChangedEvent` - Fired when user changes password
  - `UserAccountLockedEvent` - Fired when account is locked
  - `UserAccountUnlockedEvent` - Fired when account is unlocked

##### Course Domain Events
- **Location**: `src/common/domain/events/course.domain-events.ts`
- **Events**:
  - `CourseCreatedEvent` - Fired when a new course is created
  - `CoursePublishedEvent` - Fired when a course is published
  - `EnrollmentCreatedEvent` - Fired when user enrolls in course
  - `EnrollmentCompletedEvent` - Fired when course is completed

#### 3. Aggregate Root

##### Base Aggregate Root
- **Location**: `src/common/domain/aggregate-root.base.ts`
- **Purpose**: Base class for aggregate roots
- **Features**:
  - Domain event management
  - Event collection and clearing

#### 4. Rich Domain Models

##### User Aggregate
- **Location**: `src/user/entities/user-rich.entity.ts`
- **Purpose**: User aggregate root with rich business logic
- **Business Rules**:
  - Password strength validation
  - Account locking after failed attempts
  - Role-based permissions
  - Email and username validation
  - Account status management

##### Course Aggregate
- **Location**: `src/course/entities/course-rich.entity.ts`
- **Purpose**: Course aggregate root with business logic
- **Business Rules**:
  - Publishing validation
  - Price management
  - Duration calculations
  - Status transitions

##### Enrollment Aggregate
- **Location**: `src/course/entities/enrollment-rich.entity.ts`
- **Purpose**: Enrollment aggregate with business logic
- **Business Rules**:
  - Progress tracking
  - Completion detection
  - Status management
  - Inactivity tracking

#### 5. Domain Services

Domain services handle complex business logic that doesn't naturally fit in entities.

##### User Domain Service
- **Location**: `src/user/services/user-domain.service.ts`
- **Responsibilities**:
  - Enrollment eligibility validation
  - User statistics calculation
  - Certificate eligibility
  - Inactivity detection
  - User deletion validation

##### Course Domain Service
- **Location**: `src/course/services/course-domain.service.ts`
- **Responsibilities**:
  - Course publishing validation
  - Course analytics
  - Course recommendations
  - Course deletion validation
  - Instructor statistics

## Business Rules

### User Business Rules

1. **Account Security**:
   - Passwords must be at least 8 characters with uppercase, lowercase, numbers, and special characters
   - Accounts lock after 5 failed login attempts for 30 minutes
   - Email changes require re-verification

2. **User Status**:
   - Only active, non-locked users can login
   - Suspended users cannot access the system
   - Deleted users cannot be restored

3. **Enrollment Rules**:
   - Users cannot enroll in the same course twice
   - Only active users can enroll in courses
   - Completed enrollments cannot be dropped

### Course Business Rules

1. **Publishing Requirements**:
   - Courses must have title, description, level, and language
   - Courses must have at least one module with lessons
   - Duration must be greater than 0
   - Published courses cannot have basic info changed

2. **Pricing Rules**:
   - Prices cannot be negative
   - Currency must be valid (USD, EUR, GBP, JPY, CAD, AUD)
   - Published courses cannot change prices

3. **Enrollment Rules**:
   - Only published courses can be enrolled in
   - Progress must be between 0 and 100
   - Auto-completion at 100% progress

### Enrollment Business Rules

1. **Progress Tracking**:
   - Progress updates only allowed for active enrollments
   - Progress is rounded to 2 decimal places
   - Last access time is updated on progress changes

2. **Status Transitions**:
   - Active → Completed (when progress reaches 100%)
   - Active → Suspended (administrative action)
   - Active → Dropped (user action)
   - Suspended → Active (reactivation)

## Implementation Guidelines

### Creating New Value Objects

1. Make them immutable
2. Validate invariants in factory methods
3. Override equality methods
4. Provide meaningful toString methods

### Creating New Domain Events

1. Extend `DomainEvent` base class
2. Include all relevant data in the constructor
3. Implement `getEventName()` method
4. Add events using `addDomainEvent()` in aggregates

### Creating New Aggregates

1. Extend `AggregateRoot` base class
2. Encapsulate business logic within the aggregate
3. Use factory methods for creation
4. Protect invariants with validation
5. Emit domain events for significant changes

### Creating New Domain Services

1. Use for complex business logic involving multiple aggregates
2. Keep them stateless
3. Coordinate between aggregates
4. Don't put logic that belongs in entities

## Migration Strategy

### Phase 1: Parallel Implementation
- Keep existing entities alongside new rich entities
- Implement new value objects and events
- Create domain services

### Phase 2: Gradual Migration
- Migrate read operations to new entities
- Update service layer to use domain services
- Implement event handlers for domain events

### Phase 3: Complete Migration
- Replace old entities with rich domain models
- Remove redundant code
- Update all references

## Benefits

1. **Better Encapsulation**: Business logic is contained within domain objects
2. **Improved Testability**: Rich domain models are easier to unit test
3. **Clearer Intent**: Value objects make domain concepts explicit
4. **Event-Driven Architecture**: Domain events enable loose coupling
5. **Maintainability**: Business rules are centralized and consistent

## Testing Strategy

### Unit Tests
- Test value object validation
- Test aggregate business rules
- Test domain service logic
- Test domain event emission

### Integration Tests
- Test aggregate persistence
- Test domain service interactions
- Test event handling

### Domain Tests
- Test business invariants
- Test domain rule enforcement
- Test aggregate consistency

## Future Enhancements

1. **Event Sourcing**: Implement event sourcing for aggregates
2. **Read Models**: Create optimized read models for queries
3. **Saga Pattern**: Implement long-running business processes
4. **CQRS**: Separate command and query responsibilities
5. **Domain Specifications**: Implement specification pattern for business rules
