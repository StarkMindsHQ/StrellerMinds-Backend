import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { IAuthStrategy } from './strategies/auth-strategy.interface';

describe('Auth Integration (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;

  // --- Mock strategies ---
  const mockGoogle: IAuthStrategy = {
    name: 'google',
    validate: jest.fn().mockResolvedValue({ email: 'google@test.com', id: '1' }),
    login: jest.fn().mockResolvedValue({ token: 'google-token' }),
    register: jest.fn().mockResolvedValue({ token: 'google-register-token' }),
  };
  const mockFacebook: IAuthStrategy = {
    name: 'facebook',
    validate: jest.fn().mockResolvedValue({ email: 'fb@test.com', id: '2' }),
    login: jest.fn().mockResolvedValue({ token: 'fb-token' }),
    register: jest.fn().mockResolvedValue({ token: 'fb-register-token' }),
  };
  const mockApple: IAuthStrategy = {
    name: 'apple',
    validate: jest.fn().mockResolvedValue({ email: 'apple@test.com', id: '3' }),
    login: jest.fn().mockResolvedValue({ token: 'apple-token' }),
    register: jest.fn().mockResolvedValue({ token: 'apple-register-token' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider('AUTH_STRATEGIES')
      .useValue([mockGoogle, mockFacebook, mockApple])
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);

    // --- Spy on AuthService methods ---
    jest.spyOn(authService, 'validate');
    jest.spyOn(authService, 'login');
    jest.spyOn(authService, 'register');
    jest.spyOn(authService, 'refreshToken');
    jest.spyOn(authService, 'changePassword');
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------- LOGIN TESTS ----------
  it.each([
    ['google', 'google@test.com', 'google-token'],
    ['facebook', 'fb@test.com', 'fb-token'],
    ['apple', 'apple@test.com', 'apple-token'],
  ])('POST /auth/login using %s', async (provider, email, token) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ provider, email, password: 'dummy' })
      .expect(201);

    expect(res.body.token).toEqual(token);
    expect(authService.validate).toHaveBeenCalledWith(provider, { email, password: 'dummy' });
    expect(authService.login).toHaveBeenCalled();
  });

  it('POST /auth/login with unsupported provider should fail', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ provider: 'unknown', email: 'test@test.com', password: 'dummy' })
      .expect(400);
  });

  // ---------- REGISTER TESTS ----------
  it.each([
    ['google', 'google-register-token'],
    ['facebook', 'fb-register-token'],
    ['apple', 'apple-register-token'],
  ])('POST /auth/register using %s', async (provider, token) => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ provider, email: `${provider}@test.com`, password: 'StrongP@ss123' })
      .expect(201);

    expect(res.body.token).toEqual(token);
    expect(authService.register).toHaveBeenCalled();
  });

  it('POST /auth/register with unsupported provider should fail', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ provider: 'unknown', email: 'test@test.com', password: 'StrongP@ss123' })
      .expect(400);
  });

  // ---------- REFRESH TOKEN TESTS ----------
  it('POST /auth/refresh should call refreshToken', async () => {
    const mockTokens = { accessToken: 'new-token', refreshToken: 'new-refresh' };
    authService.refreshToken.mockResolvedValue(mockTokens);

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ userId: 'user-id', refreshToken: 'refresh-token' })
      .expect(201);

    expect(res.body).toEqual(mockTokens);
    expect(authService.refreshToken).toHaveBeenCalledWith('user-id', 'refresh-token');
  });

  it('POST /auth/refresh with missing fields should fail', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ userId: 'user-id' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'token' })
      .expect(401);
  });

  // ---------- CHANGE PASSWORD TESTS ----------
  it('POST /auth/change-password should call changePassword', async () => {
    authService.changePassword.mockResolvedValue(true);

    const res = await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({ userId: 'user-id', currentPassword: 'oldPass', newPassword: 'NewStrongP@ss123' })
      .expect(201);

    expect(res.body).toBe(true);
    expect(authService.changePassword).toHaveBeenCalledWith('user-id', 'oldPass', 'NewStrongP@ss123');
  });

  it('POST /auth/change-password with missing fields should fail', async () => {
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({ userId: 'user-id', newPassword: 'NewPass' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({ userId: 'user-id', currentPassword: 'oldPass' })
      .expect(400);
  });

  // ---------- PASSWORD REQUIREMENTS TEST ----------
  it('GET /auth/password-requirements should return password rules', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/password-requirements')
      .expect(200);

    expect(res.body.requirements).toEqual([
      'At least 8 characters long',
      'Contains at least one uppercase letter',
      'Contains at least one lowercase letter',
      'Contains at least one number',
      'Contains at least one special character',
    ]);
  });
});
