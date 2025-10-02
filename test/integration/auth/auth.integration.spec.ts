import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';

import { AuthModule } from '../../../src/auth/auth.module';
import { UsersModule } from '../../../src/users/users.module';
import { User } from '../../../src/users/entities/user.entity';
import { RefreshToken } from '../../../src/auth/entities/refresh-token.entity';
import { userFactory } from '../../factories';
import { DatabaseTestModule } from '../../utils/database-test.module';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseTestModule,
        TypeOrmModule.forFeature([User, RefreshToken]),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await global.testUtils.cleanupDatabase();
  });

  describe('POST /auth/register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        user: {
          id: expect.any(String),
          email: registerDto.email,
          name: registerDto.name,
          role: 'student',
        },
      });

      expect(response.body.user.id).toBeValidUUID();
      expect(response.body.user.email).toBeValidEmail();
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...registerDto,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toHaveValidationError('email');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...registerDto,
          password: '123',
        })
        .expect(400);

      expect(response.body).toHaveValidationError('password');
    });

    it('should return 409 for duplicate email', async () => {
      // First registration
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

      // Second registration with same email
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveValidationError('email');
      expect(response.body).toHaveValidationError('password');
      expect(response.body).toHaveValidationError('name');
    });
  });

  describe('POST /auth/login', () => {
    let testUser: User;

    beforeEach(async () => {
      // Create test user
      testUser = userFactory.forAuth('password123');
      await request(app.getHttpServer()).post('/auth/register').send({
        email: testUser.email,
        password: 'password123',
        name: testUser.name,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        user: {
          id: expect.any(String),
          email: testUser.email,
          name: testUser.name,
        },
      });
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 400 for missing credentials', async () => {
      await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register and login to get refresh token
      const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      });

      refreshToken = registerResponse.body.refresh_token;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        access_token: expect.any(String),
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'invalid-token',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should return 400 for missing refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      });

      refreshToken = registerResponse.body.refresh_token;
    });

    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refresh_token: refreshToken,
        })
        .expect(200);

      // Verify refresh token is invalidated
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = userFactory.forAuth();
      await request(app.getHttpServer()).post('/auth/register').send({
        email: testUser.email,
        password: 'password123',
        name: testUser.name,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      });
    });

    it('should send password reset email for existing user', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testUser.email,
        })
        .expect(200);
    });

    it('should not reveal if email does not exist', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com',
        })
        .expect(200);
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'invalid-email',
        })
        .expect(400);
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;
    let testUser: User;

    beforeEach(async () => {
      testUser = userFactory.forAuth();
      const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
        email: testUser.email,
        password: 'password123',
        name: testUser.name,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      });

      accessToken = registerResponse.body.access_token;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: testUser.email,
        name: testUser.name,
      });
    });

    it('should return 401 for missing token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should return 401 for invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 for malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });
  });
});
