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

describe('Blockchain Interaction Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userRepository: Repository<User>;

  let testStudent: User;
  let studentToken: string;

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

    await setupTestUsers();
  });

  async function setupTestUsers() {
    // Create student
    const studentResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'student@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Student',
        role: 'student',
      })
      .expect(201);

    testStudent = (await userRepository.findOne({
      where: { email: 'student@example.com' },
    })) as User;
    studentToken = studentResponse.body.access_token;
  }

  describe('Wallet Connection', () => {
    it('should connect Ethereum wallet', async () => {
      const walletResponse = await request(app.getHttpServer())
        .post('/blockchain/wallet/connect')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          blockchain: 'ethereum',
          walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          signature: 'test-signature',
        })
        .expect(201);

      expect(walletResponse.body).toMatchObject({
        id: expect.any(String),
        userId: testStudent.id,
        blockchain: 'ethereum',
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        status: 'connected',
        connectedAt: expect.any(String),
      });
    });

    it('should connect Stellar wallet', async () => {
      const walletResponse = await request(app.getHttpServer())
        .post('/blockchain/wallet/connect')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          blockchain: 'stellar',
          walletAddress: 'GABC1234567890ABCDEF1234567890ABCDEF1234',
          signature: 'test-signature',
        })
        .expect(201);

      expect(walletResponse.body).toMatchObject({
        id: expect.any(String),
        userId: testStudent.id,
        blockchain: 'stellar',
        walletAddress: 'GABC1234567890ABCDEF1234567890ABCDEF1234',
        status: 'connected',
      });
    });

    it('should connect Polygon wallet', async () => {
      const walletResponse = await request(app.getHttpServer())
        .post('/blockchain/wallet/connect')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          blockchain: 'polygon',
          walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          signature: 'test-signature',
        })
        .expect(201);

      expect(walletResponse.body).toMatchObject({
        id: expect.any(String),
        userId: testStudent.id,
        blockchain: 'polygon',
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        status: 'connected',
      });
    });

    it('should list connected wallets', async () => {
      // Connect multiple wallets
      await request(app.getHttpServer())
        .post('/blockchain/wallet/connect')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          blockchain: 'ethereum',
          walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          signature: 'test-signature',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/blockchain/wallet/connect')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          blockchain: 'stellar',
          walletAddress: 'GABC1234567890ABCDEF1234567890ABCDEF1234',
          signature: 'test-signature',
        })
        .expect(201);

      // Get connected wallets
      const walletsResponse = await request(app.getHttpServer())
        .get('/blockchain/wallet/my-wallets')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(walletsResponse.body.wallets).toHaveLength(2);
      expect(walletsResponse.body.wallets[0]).toMatchObject({
        blockchain: expect.any(String),
        walletAddress: expect.any(String),
        status: 'connected',
      });
    });
  });

  describe('Credential Management', () => {
    it('should issue credential to blockchain', async () => {
      const credentialData = {
        type: 'course_completion',
        courseId: 'course-123',
        studentId: testStudent.id,
        metadata: {
          courseTitle: 'Blockchain Course',
          completionDate: new Date().toISOString(),
          grade: 'A+',
        },
      };

      const credentialResponse = await request(app.getHttpServer())
        .post('/blockchain/credentials/issue')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          ...credentialData,
          blockchain: 'ethereum',
          walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        })
        .expect(201);

      expect(credentialResponse.body).toMatchObject({
        id: expect.any(String),
        type: 'course_completion',
        blockchain: 'ethereum',
        transactionHash: expect.any(String),
        status: 'issued',
        issuedAt: expect.any(String),
      });
    });

    it('should verify credential on blockchain', async () => {
      const credentialId = 'credential-123';

      const verificationResponse = await request(app.getHttpServer())
        .get(`/blockchain/credentials/${credentialId}/verify`)
        .expect(200);

      expect(verificationResponse.body).toMatchObject({
        valid: true,
        credential: {
          id: credentialId,
          type: 'course_completion',
          blockchain: 'ethereum',
          status: 'issued',
        },
        verificationDate: expect.any(String),
      });
    });

    it('should share credential across blockchains', async () => {
      const credentialId = 'credential-123';

      const shareResponse = await request(app.getHttpServer())
        .post(`/blockchain/credentials/${credentialId}/share`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          targetBlockchain: 'stellar',
          targetWalletAddress: 'GABC1234567890ABCDEF1234567890ABCDEF1234',
        })
        .expect(200);

      expect(shareResponse.body).toMatchObject({
        shareId: expect.any(String),
        sourceBlockchain: 'ethereum',
        targetBlockchain: 'stellar',
        status: 'shared',
        sharedAt: expect.any(String),
      });
    });
  });

  describe('Cross-Chain Operations', () => {
    it('should perform cross-chain credential transfer', async () => {
      const transferResponse = await request(app.getHttpServer())
        .post('/blockchain/transfer')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          credentialId: 'credential-123',
          fromBlockchain: 'ethereum',
          toBlockchain: 'polygon',
          fromWalletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          toWalletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        })
        .expect(200);

      expect(transferResponse.body).toMatchObject({
        transferId: expect.any(String),
        status: 'processing',
        fromBlockchain: 'ethereum',
        toBlockchain: 'polygon',
        initiatedAt: expect.any(String),
      });
    });

    it('should handle cross-chain transaction status', async () => {
      const transferId = 'transfer-123';

      const statusResponse = await request(app.getHttpServer())
        .get(`/blockchain/transfer/${transferId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        transferId: transferId,
        status: expect.any(String),
        progress: expect.any(Number),
        estimatedCompletion: expect.any(String),
      });
    });
  });

  describe('Blockchain Security', () => {
    it('should validate wallet signatures', async () => {
      const invalidSignatureResponse = await request(app.getHttpServer())
        .post('/blockchain/wallet/connect')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          blockchain: 'ethereum',
          walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          signature: 'invalid-signature',
        })
        .expect(400);

      expect(invalidSignatureResponse.body.message).toContain('signature');
    });

    it('should prevent unauthorized credential access', async () => {
      const unauthorizedResponse = await request(app.getHttpServer())
        .get('/blockchain/credentials/credential-123')
        .expect(401);

      expect(unauthorizedResponse.body.message).toContain('unauthorized');
    });

    it('should audit blockchain operations', async () => {
      const auditResponse = await request(app.getHttpServer())
        .get('/blockchain/audit')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(auditResponse.body).toMatchObject({
        operations: expect.any(Array),
        totalOperations: expect.any(Number),
        auditPeriod: {
          startDate: expect.any(String),
          endDate: expect.any(String),
        },
      });
    });
  });

  describe('Blockchain Monitoring', () => {
    it('should monitor blockchain health', async () => {
      const healthResponse = await request(app.getHttpServer())
        .get('/blockchain/health')
        .expect(200);

      expect(healthResponse.body).toMatchObject({
        ethereum: {
          status: 'healthy',
          lastBlock: expect.any(Number),
          latency: expect.any(Number),
        },
        stellar: {
          status: 'healthy',
          lastBlock: expect.any(Number),
          latency: expect.any(Number),
        },
        polygon: {
          status: 'healthy',
          lastBlock: expect.any(Number),
          latency: expect.any(Number),
        },
      });
    });

    it('should handle blockchain network issues', async () => {
      const networkIssueResponse = await request(app.getHttpServer())
        .post('/blockchain/wallet/connect')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          blockchain: 'ethereum',
          walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          signature: 'test-signature',
        })
        .expect(503);

      expect(networkIssueResponse.body.message).toContain('network');
    });
  });
});
