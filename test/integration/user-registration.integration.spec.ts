import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../../src/app.module';
import { User } from '../../src/users/entities/user.entity';
import { DatabaseTestModule } from '../utils/database-test.module';

describe('User Registration Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseTestModule,
        TypeOrmModule.forFeature([User]),
        AppModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await userRepository.clear();
  });

  describe('Complete User Registration Flow', () => {
    it('should complete full registration flow successfully', async () => {
      const validUserData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
      };

      // Step 1: Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      expect(registerResponse.body).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        user: {
          id: expect.any(String),
          email: validUserData.email,
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          role: 'student',
          isEmailVerified: false,
        },
      });

      // Step 2: Verify user exists in database
      const savedUser = await userRepository.findOne({
        where: { email: validUserData.email },
      });

      expect(savedUser).toBeDefined();
      expect(savedUser?.email).toBe(validUserData.email);
      expect(savedUser?.firstName).toBe(validUserData.firstName);
      expect(savedUser?.lastName).toBe(validUserData.lastName);
      expect(savedUser?.isEmailVerified).toBe(false);
      expect(savedUser?.role).toBe('student');

      // Step 3: Verify access token can be used to access protected routes
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${registerResponse.body.access_token}`)
        .expect(200);

      expect(profileResponse.body).toMatchObject({
        id: savedUser?.id,
        email: validUserData.email,
        firstName: validUserData.firstName,
        lastName: validUserData.lastName,
      });
    });

    it('should handle email verification flow', async () => {
      const userData = {
        email: 'verify@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'student',
      };

      // Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const userId = registerResponse.body.user.id;

      // Verify email
      const verifyResponse = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          userId: userId,
          token: 'test-verification-token',
        })
        .expect(200);

      expect(verifyResponse.body).toMatchObject({
        message: 'Email verified successfully',
        user: {
          id: userId,
          isEmailVerified: true,
        },
      });

      // Verify user is updated in database
      const updatedUser = await userRepository.findOne({
        where: { id: userId },
      });

      expect(updatedUser?.isEmailVerified).toBe(true);
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        firstName: 'First',
        lastName: 'User',
        role: 'student',
      };

      // First registration
      await request(app.getHttpServer()).post('/auth/register').send(userData).expect(201);

      // Attempt duplicate registration
      const duplicateResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...userData,
          firstName: 'Second',
          lastName: 'User',
        })
        .expect(400);

      expect(duplicateResponse.body.message).toContain('already exists');
    });

    it('should validate password strength requirements', async () => {
      const weakPasswords = ['123', 'password', '12345678', 'Password', 'Password1'];

      for (const password of weakPasswords) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test${Math.random()}@example.com`,
            password: password,
            firstName: 'Test',
            lastName: 'User',
            role: 'student',
          })
          .expect(400);

        expect(response.body.message).toContain('password');
      }
    });

    it('should sanitize and validate user input', async () => {
      const maliciousInput = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe',
        role: 'student',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(maliciousInput)
        .expect(201);

      // Verify input was sanitized
      const savedUser = await userRepository.findOne({
        where: { email: 'test@example.com' },
      });

      expect(savedUser?.firstName).not.toContain('<script>');
      expect(savedUser?.firstName).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle concurrent registration attempts', async () => {
      const userData = {
        email: 'concurrent@example.com',
        password: 'SecurePass123!',
        firstName: 'Concurrent',
        lastName: 'User',
        role: 'student',
      };

      // Attempt concurrent registrations
      const promises = Array(5)
        .fill(null)
        .map(() => request(app.getHttpServer()).post('/auth/register').send(userData));

      const responses = await Promise.allSettled(promises);

      // Only one should succeed
      const successful = responses.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 201,
      );
      const failed = responses.filter((r) => r.status === 'fulfilled' && r.value.status === 400);

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(4);
    });

    it('should handle registration with different user roles', async () => {
      const roles = ['student', 'instructor', 'admin'];

      for (const role of roles) {
        const userData = {
          email: `${role}@example.com`,
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: role,
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.user.role).toBe(role);

        // Verify in database
        const savedUser = await userRepository.findOne({
          where: { email: `${role}@example.com` },
        });

        expect(savedUser?.role).toBe(role);
      }
    });

    it('should generate unique user IDs', async () => {
      const userData1 = {
        email: 'user1@example.com',
        password: 'SecurePass123!',
        firstName: 'User',
        lastName: 'One',
        role: 'student',
      };

      const userData2 = {
        email: 'user2@example.com',
        password: 'SecurePass123!',
        firstName: 'User',
        lastName: 'Two',
        role: 'student',
      };

      const response1 = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData1)
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData2)
        .expect(201);

      expect(response1.body.user.id).not.toBe(response2.body.user.id);
      expect(response1.body.user.id).toMatch(/^[a-f0-9-]{36}$/);
      expect(response2.body.user.id).toMatch(/^[a-f0-9-]{36}$/);
    });

    it('should handle international characters in names', async () => {
      const userData = {
        email: 'international@example.com',
        password: 'SecurePass123!',
        firstName: 'José',
        lastName: 'García',
        role: 'student',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.firstName).toBe('José');
      expect(response.body.user.lastName).toBe('García');

      // Verify in database
      const savedUser = await userRepository.findOne({
        where: { email: 'international@example.com' },
      });

      expect(savedUser?.firstName).toBe('José');
      expect(savedUser?.lastName).toBe('García');
    });

    it('should set appropriate default values', async () => {
      const userData = {
        email: 'defaults@example.com',
        password: 'SecurePass123!',
        firstName: 'Default',
        lastName: 'User',
        role: 'student',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user).toMatchObject({
        isEmailVerified: false,
        accountStatus: 'active',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });
  });

  describe('Registration Edge Cases', () => {
    it('should handle registration during high load', async () => {
      const userPromises = Array(10)
        .fill(null)
        .map((_, index) => {
          const userData = {
            email: `loadtest${index}@example.com`,
            password: 'SecurePass123!',
            firstName: 'Load',
            lastName: 'Test',
            role: 'student',
          };

          return request(app.getHttpServer()).post('/auth/register').send(userData);
        });

      const responses = await Promise.all(userPromises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.user).toBeDefined();
      });
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: longEmail,
          password: 'SecurePass123!',
          firstName: 'Long',
          lastName: 'Email',
          role: 'student',
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should handle registration with empty optional fields', async () => {
      const userData = {
        email: 'minimal@example.com',
        password: 'SecurePass123!',
        firstName: 'Minimal',
        lastName: 'User',
        role: 'student',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('minimal@example.com');
    });
  });

  describe('Registration Security Tests', () => {
    it('should rate limit registration attempts', async () => {
      const userData = {
        email: 'ratelimit@example.com',
        password: 'SecurePass123!',
        firstName: 'Rate',
        lastName: 'Limit',
        role: 'student',
      };

      // Make multiple rapid requests
      const promises = Array(20)
        .fill(null)
        .map(() => request(app.getHttpServer()).post('/auth/register').send(userData));

      const responses = await Promise.allSettled(promises);
      const rateLimited = responses.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 429,
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should not leak sensitive information in error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'weak',
          firstName: '',
          lastName: '',
          role: 'invalid-role',
        })
        .expect(400);

      // Error messages should not contain sensitive information
      expect(response.body.message).not.toContain('password');
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('sql');
    });

    it('should hash passwords securely', async () => {
      const userData = {
        email: 'passwordtest@example.com',
        password: 'SecurePass123!',
        firstName: 'Password',
        lastName: 'Test',
        role: 'student',
      };

      await request(app.getHttpServer()).post('/auth/register').send(userData).expect(201);

      const savedUser = await userRepository.findOne({
        where: { email: 'passwordtest@example.com' },
      });

      // Password should be hashed, not stored in plain text
      expect(savedUser?.password).not.toBe('SecurePass123!');
      expect(savedUser?.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
      expect(savedUser?.password.length).toBeGreaterThan(50);
    });
  });
});
