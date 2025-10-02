import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CredentialService } from './credential.service';
import { Credential } from './entities/credential.entity';
import { StellarService } from '../blockchain/stellar/stellar.service';

describe('CredentialService.verifyCredential', () => {
  let service: CredentialService;
  let repo: jest.Mocked<Repository<Credential>>;
  let stellar: { monitorTransaction: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    stellar = { monitorTransaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        { provide: getRepositoryToken(Credential), useValue: repo },
        { provide: StellarService, useValue: stellar },
      ],
    }).compile();

    service = module.get(CredentialService);
  });

  it('verifies credential on Stellar and updates verificationStatus true when ledger matches blockHeight', async () => {
    const credential: Partial<Credential> = {
      id: 'cred-1',
      userId: 'user-1',
      txHash: 'tx-abc',
      network: 'stellar',
      blockHeight: 123,
      verificationStatus: false,
    };
    repo.findOne.mockResolvedValue(credential as Credential);
    stellar.monitorTransaction.mockResolvedValue({ ledger: 123 });
    repo.save.mockImplementation(async (c: Credential) => c);

    const result = await service.verifyCredential('user-1', 'cred-1');

    expect(stellar.monitorTransaction).toHaveBeenCalledWith('tx-abc');
    expect(repo.save).toHaveBeenCalled();
    expect(result.verified).toBe(true);
    expect(result.credential.verificationStatus).toBe(true);
  });

  it('returns verified false if transaction not found', async () => {
    const credential: Partial<Credential> = {
      id: 'cred-2',
      userId: 'user-1',
      txHash: 'tx-missing',
      network: 'stellar',
      blockHeight: 999,
      verificationStatus: false,
    };
    repo.findOne.mockResolvedValue(credential as Credential);
    stellar.monitorTransaction.mockResolvedValue(null);
    repo.save.mockImplementation(async (c: Credential) => c);

    const result = await service.verifyCredential('user-1', 'cred-2');

    expect(result.verified).toBe(false);
    expect(result.credential.verificationStatus).toBe(false);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CredentialService } from '../credential.service';
import { Credential } from '../entities/credential.entity';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { CredentialStatus } from '../dto/credential-history-query.dto';

describe('CredentialService', () => {
  let service: CredentialService;
  let repository: Repository<Credential>;
  let blockchainService: BlockchainService;

  const mockCredential = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    type: 'academic',
    name: 'Computer Science Degree',
    metadata: { university: 'MIT', year: 2023 },
    issuerId: 'issuer-123',
    issuerName: 'MIT University',
    issuedAt: new Date('2023-01-01'),
    expiresAt: new Date('2028-01-01'),
    status: 'VERIFIED',
    txHash: 'abc123txhash',
    network: 'stellar-testnet',
    blockHeight: 12345,
    verificationStatus: true,
    updatedAt: new Date(),
  };

  const mockCredentialRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockBlockchainService = {
    verifyTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        {
          provide: getRepositoryToken(Credential),
          useValue: mockCredentialRepository,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile();

    service = module.get<CredentialService>(CredentialService);
    repository = module.get<Repository<Credential>>(getRepositoryToken(Credential));
    blockchainService = module.get<BlockchainService>(BlockchainService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserCredentialHistory', () => {
    it('should return paginated credential history for a user', async () => {
      const queryParams = {
        page: 1,
        limit: 10,
        status: CredentialStatus.ALL,
      };

      mockCredentialRepository.findAndCount.mockResolvedValue([[mockCredential], 1]);

      const result = await service.getUserCredentialHistory('user-123', queryParams);

      expect(mockCredentialRepository.findAndCount).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id', mockCredential.id);
    });

    it('should apply filters correctly when provided', async () => {
      const queryParams = {
        page: 1,
        limit: 10,
        credentialType: 'academic',
        startDate: new Date('2022-01-01'),
        endDate: new Date('2023-12-31'),
        status: CredentialStatus.VERIFIED,
      };

      mockCredentialRepository.findAndCount.mockResolvedValue([[mockCredential], 1]);

      await service.getUserCredentialHistory('user-123', queryParams);

      expect(mockCredentialRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            type: 'academic',
            status: 'VERIFIED',
          }),
        }),
      );
    });
  });

  describe('verifyCredential', () => {
    it('should verify a credential and update its status', async () => {
      mockCredentialRepository.findOne.mockResolvedValue(mockCredential);
      mockBlockchainService.verifyTransaction.mockResolvedValue({ verified: true });
      mockCredentialRepository.save.mockResolvedValue({
        ...mockCredential,
        verificationStatus: true,
      });

      const result = await service.verifyCredential('user-123', mockCredential.id);

      expect(mockCredentialRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCredential.id, userId: 'user-123' },
      });
      expect(mockBlockchainService.verifyTransaction).toHaveBeenCalledWith(mockCredential.txHash);
      expect(mockCredentialRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('verified', true);
      expect(result).toHaveProperty('credential');
    });

    it('should throw an error when credential is not found', async () => {
      mockCredentialRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyCredential('user-123', 'non-existent-id')).rejects.toThrow();
    });
  });
});
