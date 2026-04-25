# Task Implementation Plan

## Overview
This document outlines the implementation plan for four critical/high-priority security and performance enhancements for the StrellerMinds Backend platform.

---

## Task 1: Account Lockout After Failed Login Attempts
**Priority:** Critical  
**Status:** ⬜ Pending  
**Implementation Area:** Authentication Service

### Objective
Lock accounts after 5 failed login attempts for 30 minutes to prevent brute force attacks.

### Implementation Steps

#### 1.1 Update User Entity
Add fields to track failed login attempts and lock status:
- `failedLoginAttempts: number` (default: 0)
- `lockedUntil: Date | null` (nullable timestamp for lock expiration)

**File:** `src/auth/entities/user.entity.ts`

```typescript
@Column({ default: 0 })
failedLoginAttempts: number;

@Column({ nullable: true })
lockedUntil: Date;
```

#### 1.2 Update AuthService Login Method
Implement login attempt tracking and account lockout logic:

**File:** `src/auth/services/auth.service.ts`

```typescript
async login(email: string, password: string) {
  const user = await this.userRepository.findOne({ where: { email } });
  
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    throw new UnauthorizedException(
      `Account locked. Try again in ${remainingMinutes} minutes`
    );
  }

  // Validate password (use bcrypt.compare)
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    // Increment failed attempts
    user.failedLoginAttempts += 1;
    
    // Lock account if threshold reached
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      user.failedLoginAttempts = 0; // Reset after lock
    }
    
    await this.userRepository.save(user);
    throw new UnauthorizedException('Invalid credentials');
  }

  // Reset failed attempts on successful login
  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);
  }

  // Generate JWT tokens
  const payload = { sub: user.id, email: user.email };
  const accessToken = this.jwtService.sign(payload);
  const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

  return { 
    message: 'Login successful', 
    accessToken, 
    refreshToken,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
  };
}
```

#### 1.3 Add Dependencies
Ensure `bcrypt` and `@nestjs/jwt` are properly configured in `auth.module.ts`.

#### 1.4 Testing
- Test account locks after 5 failed attempts
- Test lock expires after 30 minutes
- Test successful login resets counter
- Test locked account rejection message

---

## Task 2: Prevent N+1 Query Performance Issues
**Priority:** Critical  
**Status:** ⬜ Pending  
**Implementation Area:** All Service Layers (User, Course)

### Objective
Use eager loading and batch queries to prevent N+1 query performance issues.

### Implementation Steps

#### 2.1 Implement Eager Loading with TypeORM Relations
Update entities to define relationships and use eager loading where appropriate.

**Example:** If courses have instructors, lessons, or enrollments:

```typescript
@Entity()
export class Course {
  // ... existing fields

  @OneToMany(() => Enrollment, enrollment => enrollment.course, { eager: true })
  enrollments: Enrollment[];

  @ManyToMany(() => User, { eager: true })
  @JoinTable()
  instructors: User[];
}
```

#### 2.2 Use TypeORM Query Builder for Batch Queries
Replace simple `find()` calls with optimized queries using `QueryBuilder`:

**File:** `src/user/user.service.ts`

```typescript
async findAll(): Promise<User[]> {
  return this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.courses', 'courses')
    .leftJoinAndSelect('user.profile', 'profile')
    .getMany();
}

async findOne(id: string): Promise<User | null> {
  return this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.courses', 'courses')
    .leftJoinAndSelect('user.profile', 'profile')
    .leftJoinAndSelect('courses.enrollments', 'enrollments')
    .where('user.id = :id', { id })
    .getOne();
}
```

**File:** `src/course/course.service.ts`

```typescript
async findAll(): Promise<Course[]> {
  return this.courseRepository
    .createQueryBuilder('course')
    .leftJoinAndSelect('course.instructors', 'instructors')
    .leftJoinAndSelect('course.enrollments', 'enrollments')
    .leftJoinAndSelect('enrollments.user', 'user')
    .where('course.isActive = :active', { active: true })
    .getMany();
}

async findOne(id: string): Promise<Course | null> {
  return this.courseRepository
    .createQueryBuilder('course')
    .leftJoinAndSelect('course.instructors', 'instructors')
    .leftJoinAndSelect('course.enrollments', 'enrollments')
    .leftJoinAndSelect('enrollments.user', 'user')
    .where('course.id = :id', { id })
    .getOne();
}
```

#### 2.3 Implement Pagination for Large Datasets
Add pagination support to prevent loading excessive data:

```typescript
async findAllPaginated(page: number = 1, limit: number = 20) {
  const [items, total] = await this.courseRepository
    .createQueryBuilder('course')
    .leftJoinAndSelect('course.instructors', 'instructors')
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

#### 2.4 Add DataLoader for Complex Batch Operations
For advanced batch loading scenarios, implement DataLoader pattern:

```typescript
// Create a dataloader instance
const userLoader = new DataLoader(async (ids: string[]) => {
  const users = await this.userRepository
    .createQueryBuilder('user')
    .where('user.id IN (:...ids)', { ids })
    .getMany();
  
  return ids.map(id => users.find(u => u.id === id) || null);
});
```

#### 2.5 Testing
- Enable TypeORM query logging to verify query count
- Test with large datasets (100+ records)
- Verify single query execution instead of N+1
- Benchmark response times before and after optimization

---

## Task 3: End-to-End Tests for Core Flows
**Priority:** High  
**Status:** ⬜ Pending  
**Implementation Area:** Test Suite (E2E)

### Objective
Implement end-to-end tests for user registration, login, and course enrollment flows.

### Implementation Steps

#### 3.1 Set Up E2E Testing Infrastructure
Create E2E test configuration:

**File:** `test/e2e/jest-e2e.config.js`

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
};
```

#### 3.2 User Registration E2E Test
**File:** `test/e2e/auth.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../src/auth/entities/user.entity';

describe('Authentication E2E (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test users
    await userRepository.delete({ email: Like('%test-e2e%') });
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test-e2e@example.com',
          password: 'StrongPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('Registration successful');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.email).toBe('test-e2e@example.com');
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should reject duplicate email', async () => {
      // Create user first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate-e2e@example.com',
          password: 'StrongPass123!',
          firstName: 'Test',
          lastName: 'User',
        });

      // Try to create again
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate-e2e@example.com',
          password: 'StrongPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(409);
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'weak-password-e2e@example.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });

    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'StrongPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'login-test-e2e@example.com',
          password: 'StrongPass123!',
          firstName: 'Login',
          lastName: 'Test',
        });
    });

    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login-test-e2e@example.com',
          password: 'StrongPass123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Login successful');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe('login-test-e2e@example.com');
        });
    });

    it('should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login-test-e2e@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent-e2e@example.com',
          password: 'StrongPass123!',
        })
        .expect(401);
    });

    it('should lock account after 5 failed attempts', async () => {
      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'login-test-e2e@example.com',
            password: 'WrongPassword123!',
          })
          .expect(401);
      }

      // 6th attempt should fail with lock message
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login-test-e2e@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Account locked');
        });
    });
  });
});
```

#### 3.3 Course Enrollment E2E Test
**File:** `test/e2e/enrollment.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Course Enrollment E2E (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let courseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register and login user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'enrollment-test-e2e@example.com',
        password: 'StrongPass123!',
        firstName: 'Enrollment',
        lastName: 'Test',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'enrollment-test-e2e@example.com',
        password: 'StrongPass123!',
      });

    accessToken = loginResponse.body.accessToken;

    // Get or create test course
    const coursesResponse = await request(app.getHttpServer())
      .get('/courses')
      .expect(200);

    courseId = coursesResponse.body[0]?.id || 'test-course-id';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /courses/:id/enroll', () => {
    it('should enroll user in course successfully', () => {
      return request(app.getHttpServer())
        .post(`/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('Enrollment successful');
          expect(res.body).toHaveProperty('enrollmentId');
        });
    });

    it('should reject enrollment without authentication', () => {
      return request(app.getHttpServer())
        .post(`/courses/${courseId}/enroll`)
        .expect(401);
    });

    it('should reject duplicate enrollment', async () => {
      // First enrollment
      await request(app.getHttpServer())
        .post(`/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // Second enrollment should fail
      return request(app.getHttpServer())
        .post(`/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);
    });
  });

  describe('GET /courses/:id/enrollments', () => {
    it('should get course enrollments', () => {
      return request(app.getHttpServer())
        .get(`/courses/${courseId}/enrollments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });
});
```

#### 3.4 Add E2E Test Script to package.json
```json
"scripts": {
  "test:e2e": "jest --config test/e2e/jest-e2e.config.js",
  "test:e2e:watch": "jest --config test/e2e/jest-e2e.config.js --watch",
  "test:e2e:coverage": "jest --config test/e2e/jest-e2e.config.js --coverage"
}
```

#### 3.5 Testing
- Run full registration flow test
- Run login with account lockout test
- Run course enrollment flow test
- Verify all edge cases covered

---

## Task 4: Artillery.io Load Testing
**Priority:** High  
**Status:** ⬜ Pending  
**Implementation Area:** Performance Testing

### Objective
Set up Artillery.io load tests to verify system handles expected traffic.

### Implementation Steps

#### 4.1 Install Artillery
```bash
npm install --save-dev artillery
```

#### 4.2 Create Artillery Configuration
**File:** `test/load/auth-load-test.yml`

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 20
      rampTo: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "User Registration and Login Flow"
    flow:
      - post:
          url: "/auth/register"
          json:
            email: "loadtest-{{$randomString()}}@example.com"
            password: "StrongPass123!"
            firstName: "Load"
            lastName: "Test"
          expect:
            - statusCode: 201
          capture:
            - json: "$.user.id"
              as: "userId"

      - think: 2

      - post:
          url: "/auth/login"
          json:
            email: "loadtest-{{$randomString()}}@example.com"
            password: "StrongPass123!"
          expect:
            - statusCode: 200
          capture:
            - json: "$.accessToken"
              as: "accessToken"

      - think: 1

      - get:
          url: "/auth/profile"
          headers:
            Authorization: "Bearer {{ accessToken }}"
          expect:
            - statusCode: 200
```

**File:** `test/load/course-load-test.yml`

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 180
      arrivalRate: 30
      rampTo: 100
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Course Browse and Enrollment Flow"
    flow:
      # Login first
      - post:
          url: "/auth/login"
          json:
            email: "loadtest-user@example.com"
            password: "StrongPass123!"
          capture:
            - json: "$.accessToken"
              as: "accessToken"

      - think: 1

      # List courses
      - get:
          url: "/courses"
          headers:
            Authorization: "Bearer {{ accessToken }}"
          expect:
            - statusCode: 200
          capture:
            - json: "$[0].id"
              as: "courseId"

      - think: 2

      # Get course details
      - get:
          url: "/courses/{{ courseId }}"
          headers:
            Authorization: "Bearer {{ accessToken }}"
          expect:
            - statusCode: 200

      - think: 1

      # Enroll in course
      - post:
          url: "/courses/{{ courseId }}/enroll"
          headers:
            Authorization: "Bearer {{ accessToken }}"
          expect:
            - statusCode: 201
```

**File:** `test/load/stress-test.yml`

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 120
      arrivalRate: 10
      rampTo: 200
      name: "Stress test - Ramp to 200 RPS"
    - duration: 180
      arrivalRate: 200
      name: "Peak load - 200 RPS"
    - duration: 60
      arrivalRate: 50
      name: "Recovery phase"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Mixed Workload Stress Test"
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "stress-test@example.com"
            password: "StrongPass123!"
          capture:
            - json: "$.accessToken"
              as: "accessToken"

      - get:
          url: "/courses"
          headers:
            Authorization: "Bearer {{ accessToken }}"

      - get:
          url: "/users"
          headers:
            Authorization: "Bearer {{ accessToken }}"
```

#### 4.3 Add Load Test Scripts to package.json
```json
"scripts": {
  "test:load:auth": "artillery run test/load/auth-load-test.yml",
  "test:load:courses": "artillery run test/load/course-load-test.yml",
  "test:load:stress": "artillery run test/load/stress-test.yml",
  "test:load:all": "npm run test:load:auth && npm run test:load:courses && npm run test:load:stress",
  "test:load:report": "artillery report"
}
```

#### 4.4 Create Load Test README
**File:** `test/load/README.md`

```markdown
# Load Testing with Artillery

## Prerequisites
```bash
npm install
```

## Running Load Tests

### Auth Load Test
```bash
npm run test:load:auth
```

### Course Load Test
```bash
npm run test:load:courses
```

### Stress Test
```bash
npm run test:load:stress
```

### Run All Tests
```bash
npm run test:load:all
```

## Generate HTML Report
```bash
artillery report report.json -o load-test-report.html
```

## Performance Targets
- **Response Time (p95):** < 500ms
- **Response Time (p99):** < 1000ms
- **Error Rate:** < 1%
- **Throughput:** > 100 requests/second
- **Concurrent Users:** 200+

## Monitoring
During load tests, monitor:
- CPU usage (< 80%)
- Memory usage (< 1GB)
- Database connections (< 100)
- Error rates in logs
```

#### 4.5 Create CI/CD Integration Script
**File:** `scripts/run-load-tests.sh`

```bash
#!/bin/bash

# Run load tests in CI/CD pipeline
set -e

echo "🚀 Starting Load Tests..."

# Start application in background
npm run start &
APP_PID=$!

# Wait for application to start
sleep 10

# Run load tests
echo "📊 Running Auth Load Test..."
npm run test:load:auth -- --output test/load/auth-report.json

echo "📊 Running Course Load Test..."
npm run test:load:courses -- --output test/load/course-report.json

echo "📊 Running Stress Test..."
npm run test:load:stress -- --output test/load/stress-report.json

# Generate HTML reports
artillery report test/load/auth-report.json -o test/load/auth-report.html
artillery report test/load/course-report.json -o test/load/course-report.html
artillery report test/load/stress-report.json -o test/load/stress-report.html

# Stop application
kill $APP_PID

echo "✅ Load tests completed. Reports generated in test/load/"
```

#### 4.6 Testing
- Run auth load test with 50 concurrent users
- Run course load test with 100 concurrent users
- Run stress test to identify breaking point
- Verify p95 response time < 500ms
- Verify error rate < 1%
- Review and analyze HTML reports

---

## Implementation Checklist

### Task 1: Account Lockout
- [ ] Update User entity with failedLoginAttempts and lockedUntil fields
- [ ] Implement login attempt tracking in AuthService
- [ ] Add bcrypt password hashing
- [ ] Add JWT token generation
- [ ] Write unit tests for account lockout
- [ ] Test lock expiration after 30 minutes
- [ ] Update API documentation

### Task 2: N+1 Query Prevention
- [ ] Add entity relationships (OneToMany, ManyToMany)
- [ ] Update UserService with QueryBuilder
- [ ] Update CourseService with QueryBuilder
- [ ] Implement pagination for large datasets
- [ ] Add eager loading where appropriate
- [ ] Enable query logging for verification
- [ ] Benchmark performance improvements

### Task 3: E2E Tests
- [ ] Set up E2E test infrastructure
- [ ] Write registration flow tests
- [ ] Write login flow tests
- [ ] Write account lockout tests
- [ ] Write course enrollment tests
- [ ] Add test cleanup logic
- [ ] Integrate with CI/CD pipeline
- [ ] Achieve > 80% E2E coverage

### Task 4: Load Testing
- [ ] Install Artillery.io
- [ ] Create auth load test configuration
- [ ] Create course load test configuration
- [ ] Create stress test configuration
- [ ] Add npm scripts for load tests
- [ ] Create load test documentation
- [ ] Integrate with CI/CD pipeline
- [ ] Verify performance targets met

---

## Dependencies Required

```json
{
  "dependencies": {
    "bcrypt": "^6.0.0",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/passport": "^11.0.5",
    "passport-jwt": "^4.0.1"
  },
  "devDependencies": {
    "artillery": "^2.0.0",
    "@types/bcrypt": "^5.0.2",
    "supertest": "^7.1.1"
  }
}
```

---

## Estimated Timeline

| Task | Priority | Estimated Time | Status |
|------|----------|----------------|--------|
| Account Lockout | Critical | 4-6 hours | ⬜ Pending |
| N+1 Query Prevention | Critical | 6-8 hours | ⬜ Pending |
| E2E Tests | High | 8-10 hours | ⬜ Pending |
| Load Testing | High | 4-6 hours | ⬜ Pending |
| **Total** | | **22-30 hours** | |

---

## Success Criteria

1. **Account Lockout:**
   - Accounts lock after exactly 5 failed attempts
   - Lock duration is exactly 30 minutes
   - Successful login resets attempt counter
   - Clear error messages for locked accounts

2. **N+1 Query Prevention:**
   - All queries use eager loading or batch queries
   - Query count verified with logging enabled
   - Response time improved by at least 50%
   - No N+1 patterns detected in code review

3. **E2E Tests:**
   - Registration flow fully tested
   - Login flow fully tested (including lockout)
   - Course enrollment flow fully tested
   - All tests pass consistently
   - Edge cases covered (invalid input, duplicates, etc.)

4. **Load Testing:**
   - System handles 100+ concurrent users
   - p95 response time < 500ms
   - Error rate < 1%
   - No memory leaks detected
   - CPU usage < 80% under load

---

## Notes

- All passwords must be hashed using bcrypt before storage
- JWT tokens should have appropriate expiration times
- Rate limiting should complement account lockout (not replace it)
- Load tests should run against staging environment, not production
- Monitor database connection pool during load tests
- Consider implementing Redis caching for frequently accessed data
- Add Sentry or similar error tracking for production monitoring
