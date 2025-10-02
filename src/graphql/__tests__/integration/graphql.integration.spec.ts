import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { GraphQLApiModule } from '../../graphql.module';

describe('GraphQL Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GraphQLApiModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Users Query', () => {
    it('should fetch users', async () => {
      const query = `
        query GetUsers($limit: Int) {
          users(limit: $limit) {
            id
            email
            firstName
            lastName
            fullName
            isActive
            createdAt
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query,
          variables: { limit: 5 },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.users).toBeInstanceOf(Array);
    });

    it('should fetch user by id', async () => {
      const query = `
        query GetUser($id: String!) {
          user(id: $id) {
            id
            email
            firstName
            lastName
            posts {
              id
              title
              status
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query,
          variables: { id: 'test-user-id' },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Posts Query', () => {
    it('should fetch posts with author', async () => {
      const query = `
        query GetPosts($limit: Int) {
          posts(limit: $limit) {
            id
            title
            content
            status
            author {
              id
              fullName
              email
            }
            createdAt
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query,
          variables: { limit: 5 },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.posts).toBeInstanceOf(Array);
    });
  });

  describe('Mutations', () => {
    it('should create a user', async () => {
      const mutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            firstName
            lastName
            fullName
            isActive
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: mutation,
          variables: {
            input: {
              email: 'newuser@example.com',
              firstName: 'New',
              lastName: 'User',
            },
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.createUser).toBeDefined();
      expect(response.body.data.createUser.email).toBe('newuser@example.com');
    });
  });

  describe('Subscriptions', () => {
    it('should handle subscription connection', async () => {
      // This would require WebSocket testing setup
      // For now, just test that the endpoint exists
      const response = await request(app.getHttpServer()).get('/graphql').expect(400);

      // GraphQL endpoint should reject GET requests without query
      expect(response.status).toBe(400);
    });
  });
});
