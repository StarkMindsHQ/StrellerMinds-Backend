import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import request from 'supertest';
import { User } from '../../src/user/entities/user.entity';
import { UserProfile } from '../../src/user/entities/user-profile.entity';
import { UserModule } from '../../src/user/user.module';

describe('User Module Integration Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let userProfileRepository: Repository<UserProfile>;

  const testUser = {
    email: 'integration-test@strellerminds.com',
    password: 'hashedPassword123!',
    firstName: 'Integration',
    lastName: 'Test',
    isActive: true,
  };

  const secondTestUser = {
    email: 'second-user@strellerminds.com',
    password: 'hashedPassword456!',
    firstName: 'Second',
    lastName: 'User',
    isActive: true,
  };

  const inactiveUser = {
    email: 'inactive@strellerminds.com',
    password: 'hashedPassword789!',
    firstName: 'Inactive',
    lastName: 'User',
    isActive: false,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'strellerminds_test',
          synchronize: true,
          dropSchema: true,
        }),
        UserModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    userRepository = moduleFixture.get('UserRepository');
    userProfileRepository = moduleFixture.get('UserProfileRepository');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  afterEach(async () => {
    // Clean up tables in correct order to respect foreign key constraints
    await userProfileRepository.clear();
    await userRepository.clear();
  });

  // ──────────────────────────────────────────────
  // Helper methods
  // ──────────────────────────────────────────────

  async function seedUser(userData: Partial<User>): Promise<User> {
    const user = userRepository.create(userData);
    return userRepository.save(user);
  }

  async function seedUsers(usersData: Partial<User>[]): Promise<User[]> {
    const users = usersData.map((data) => userRepository.create(data));
    return userRepository.save(users);
  }

  // ──────────────────────────────────────────────
  // GET /users - findAll
  // ──────────────────────────────────────────────

  describe('GET /users', () => {
    it('should return an empty array when no users exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should return a single user when one user exists', async () => {
      const savedUser = await seedUser(testUser);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);

      const returnedUser = response.body[0];
      expect(returnedUser.id).toBe(savedUser.id);
      expect(returnedUser.email).toBe(testUser.email);
      expect(returnedUser.firstName).toBe(testUser.firstName);
      expect(returnedUser.lastName).toBe(testUser.lastName);
      expect(returnedUser.isActive).toBe(testUser.isActive);
    });

    it('should return multiple users when multiple users exist', async () => {
      const savedUsers = await seedUsers([testUser, secondTestUser, inactiveUser]);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(3);

      const returnedEmails = response.body.map((u: User) => u.email);
      expect(returnedEmails).toContain(testUser.email);
      expect(returnedEmails).toContain(secondTestUser.email);
      expect(returnedEmails).toContain(inactiveUser.email);
    });

    it('should include inactive users in the result', async () => {
      await seedUser(inactiveUser);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].isActive).toBe(false);
    });

    it('should include all user fields in the response', async () => {
      await seedUser(testUser);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      const returnedUser = response.body[0];
      expect(returnedUser).toHaveProperty('id');
      expect(returnedUser).toHaveProperty('email');
      expect(returnedUser).toHaveProperty('password');
      expect(returnedUser).toHaveProperty('firstName');
      expect(returnedUser).toHaveProperty('lastName');
      expect(returnedUser).toHaveProperty('isActive');
      expect(returnedUser).toHaveProperty('createdAt');
      expect(returnedUser).toHaveProperty('updatedAt');
    });

    it('should return users with valid UUID ids', async () => {
      await seedUser(testUser);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.body[0].id).toMatch(uuidRegex);
    });

    it('should return users with valid timestamps', async () => {
      await seedUser(testUser);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      const returnedUser = response.body[0];
      expect(new Date(returnedUser.createdAt).getTime()).not.toBeNaN();
      expect(new Date(returnedUser.updatedAt).getTime()).not.toBeNaN();
    });
  });

  // ──────────────────────────────────────────────
  // GET /users/:id - findOne
  // ──────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('should return a user by valid ID', async () => {
      const savedUser = await seedUser(testUser);

      const response = await request(app.getHttpServer())
        .get(`/users/${savedUser.id}`)
        .expect(200);

      expect(response.body).not.toBeNull();
      expect(response.body.id).toBe(savedUser.id);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.lastName).toBe(testUser.lastName);
      expect(response.body.isActive).toBe(testUser.isActive);
    });

    it('should return null when user ID does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should return the correct user when multiple users exist', async () => {
      const savedUsers = await seedUsers([testUser, secondTestUser]);

      const response = await request(app.getHttpServer())
        .get(`/users/${savedUsers[1].id}`)
        .expect(200);

      expect(response.body.id).toBe(savedUsers[1].id);
      expect(response.body.email).toBe(secondTestUser.email);
      expect(response.body.firstName).toBe(secondTestUser.firstName);
    });

    it('should return an inactive user by ID', async () => {
      const savedUser = await seedUser(inactiveUser);

      const response = await request(app.getHttpServer())
        .get(`/users/${savedUser.id}`)
        .expect(200);

      expect(response.body).not.toBeNull();
      expect(response.body.isActive).toBe(false);
    });

    it('should return user with all expected fields', async () => {
      const savedUser = await seedUser(testUser);

      const response = await request(app.getHttpServer())
        .get(`/users/${savedUser.id}`)
        .expect(200);

      expect(response.body.id).toBe(savedUser.id);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.password).toBe(testUser.password);
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.lastName).toBe(testUser.lastName);
      expect(response.body.isActive).toBe(testUser.isActive);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should return user with a valid UUID id', async () => {
      const savedUser = await seedUser(testUser);

      const response = await request(app.getHttpServer())
        .get(`/users/${savedUser.id}`)
        .expect(200);

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.body.id).toMatch(uuidRegex);
    });

    it('should return valid ISO 8601 timestamps', async () => {
      const savedUser = await seedUser(testUser);

      const response = await request(app.getHttpServer())
        .get(`/users/${savedUser.id}`)
        .expect(200);

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(response.body.createdAt).toMatch(iso8601Regex);
      expect(response.body.updatedAt).toMatch(iso8601Regex);
    });
  });

  // ──────────────────────────────────────────────
  // Database constraint and integrity tests
  // ──────────────────────────────────────────────

  describe('Database Constraints and Integrity', () => {
    it('should enforce unique email constraint', async () => {
      await seedUser(testUser);

      await expect(userRepository.save(userRepository.create(testUser))).rejects.toThrow();
    });

    it('should auto-generate UUID for new users', async () => {
      const savedUser = await seedUser(testUser);

      expect(savedUser.id).toBeDefined();
      expect(typeof savedUser.id).toBe('string');
      expect(savedUser.id).not.toBe('');
    });

    it('should auto-set createdAt and updatedAt timestamps', async () => {
      const beforeCreate = new Date();
      const savedUser = await seedUser(testUser);
      const afterCreate = new Date();

      expect(new Date(savedUser.createdAt).getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(new Date(savedUser.createdAt).getTime()).toBeLessThanOrEqual(
        afterCreate.getTime(),
      );
      expect(new Date(savedUser.updatedAt).getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
    });

    it('should default isActive to true when not specified', async () => {
      const userData = {
        email: 'default-active@strellerminds.com',
        password: 'hashedPassword',
      };
      const savedUser = await seedUser(userData);

      expect(savedUser.isActive).toBe(true);
    });

    it('should allow nullable firstName and lastName', async () => {
      const userData = {
        email: 'no-names@strellerminds.com',
        password: 'hashedPassword',
      };
      const savedUser = await seedUser(userData);

      expect(savedUser.firstName).toBeNull();
      expect(savedUser.lastName).toBeNull();

      // Verify the user can be retrieved via the endpoint
      const response = await request(app.getHttpServer())
        .get(`/users/${savedUser.id}`)
        .expect(200);

      expect(response.body.firstName).toBeNull();
      expect(response.body.lastName).toBeNull();
    });

    it('should persist user data correctly across operations', async () => {
      const savedUser = await seedUser(testUser);

      // Fetch the same user directly from repository
      const fetchedUser = await userRepository.findOne({
        where: { id: savedUser.id },
      });

      expect(fetchedUser).not.toBeNull();
      expect(fetchedUser!.email).toBe(testUser.email);
      expect(fetchedUser!.firstName).toBe(testUser.firstName);
      expect(fetchedUser!.lastName).toBe(testUser.lastName);
    });
  });

  // ──────────────────────────────────────────────
  // UserProfile integration tests
  // ──────────────────────────────────────────────

  describe('UserProfile Entity Integration', () => {
    it('should create a user profile linked to a user', async () => {
      const savedUser = await seedUser(testUser);

      const profile = userProfileRepository.create({
        userId: savedUser.id,
        bio: 'Test bio for integration test',
        avatar: 'https://example.com/avatar.png',
      });
      const savedProfile = await userProfileRepository.save(profile);

      expect(savedProfile.id).toBeDefined();
      expect(savedProfile.userId).toBe(savedUser.id);
      expect(savedProfile.bio).toBe('Test bio for integration test');
      expect(savedProfile.avatar).toBe('https://example.com/avatar.png');
    });

    it('should enforce unique userId constraint on user profiles', async () => {
      const savedUser = await seedUser(testUser);

      const profile1 = userProfileRepository.create({
        userId: savedUser.id,
        bio: 'First profile',
      });
      await userProfileRepository.save(profile1);

      const profile2 = userProfileRepository.create({
        userId: savedUser.id,
        bio: 'Duplicate profile',
      });
      await expect(userProfileRepository.save(profile2)).rejects.toThrow();
    });

    it('should allow nullable bio and avatar fields', async () => {
      const savedUser = await seedUser(testUser);

      const profile = userProfileRepository.create({
        userId: savedUser.id,
      });
      const savedProfile = await userProfileRepository.save(profile);

      expect(savedProfile.bio).toBeNull();
      expect(savedProfile.avatar).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // UserService direct integration tests
  // ──────────────────────────────────────────────

  describe('UserService Integration', () => {
    it('findAll should return all persisted users', async () => {
      await seedUsers([testUser, secondTestUser]);

      const users = await userRepository.find();
      expect(users).toHaveLength(2);
    });

    it('findOne should return the correct user by ID', async () => {
      const savedUsers = await seedUsers([testUser, secondTestUser]);

      const found = await userRepository.findOne({
        where: { id: savedUsers[0].id },
      });

      expect(found).not.toBeNull();
      expect(found!.id).toBe(savedUsers[0].id);
      expect(found!.email).toBe(testUser.email);
    });

    it('findOne should return null for non-existent ID', async () => {
      const found = await userRepository.findOne({
        where: { id: '00000000-0000-0000-0000-000000000000' },
      });

      expect(found).toBeNull();
    });

    it('should reflect database changes in subsequent queries', async () => {
      // Initially empty
      let users = await userRepository.find();
      expect(users).toHaveLength(0);

      // After seeding one user
      await seedUser(testUser);
      users = await userRepository.find();
      expect(users).toHaveLength(1);

      // After seeding another user
      await seedUser(secondTestUser);
      users = await userRepository.find();
      expect(users).toHaveLength(2);
    });
  });
});
