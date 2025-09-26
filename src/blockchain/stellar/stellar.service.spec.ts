import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from './stellar.service';
import stellarConfig from '../../config/stellar.config';
import { Horizon } from 'stellar-sdk';

// Mock Stellar SDK to avoid actual network calls
jest.mock('stellar-sdk', () => ({
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
    transactions: () => ({
      transaction: jest.fn().mockImplementation(() => ({
        call: jest.fn(),
      })),
    }),
  })),
  },
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
    PUBLIC: 'Public Global Stellar Network ; September 2015',
  },
}));

describe('StellarService', () => {
  let service: StellarService;
  let mockStellarConfig: any;
  let mockServer: jest.Mocked<any>;

  beforeEach(async () => {
    mockStellarConfig = {
      networks: {
        mainnet: {
          horizonUrl: 'https://horizon.stellar.org',
          networkPassphrase: 'Public Global Stellar Network ; September 2015',
        },
        testnet: {
          horizonUrl: 'https://horizon-testnet.stellar.org',
          networkPassphrase: 'Test SDF Network ; September 2015',
        },
      },
      defaultNetwork: 'testnet',
      timeout: 5000,
      retryAttempts: 2,
      retryDelay: 100,
    };

    mockServer = {
      transactions: jest.fn().mockReturnValue({
        transaction: jest.fn().mockReturnValue({
          call: jest.fn(),
        }),
      }),
    };

    (Horizon.Server as jest.Mock).mockImplementation(() => mockServer);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: stellarConfig.KEY,
          useValue: mockStellarConfig,
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with default network configuration', () => {
    expect(Horizon.Server).toHaveBeenCalledWith('https://horizon-testnet.stellar.org');
  });

  describe('monitorTransaction', () => {
    it('should successfully monitor transaction with valid hash', async () => {
      const mockTransaction = { ledger: 12345, hash: 'test-hash' };
      mockServer.transactions().transaction().call.mockResolvedValue(mockTransaction);

      const result = await service.monitorTransaction('test-hash');

      expect(result).toEqual(mockTransaction);
      expect(mockServer.transactions().transaction).toHaveBeenCalledWith('test-hash');
    });

    it('should throw error for invalid transaction hash', async () => {
      await expect(service.monitorTransaction('')).rejects.toThrow(
        'Invalid transaction hash provided',
      );
      await expect(service.monitorTransaction(null as any)).rejects.toThrow(
        'Invalid transaction hash provided',
      );
    });

    it('should handle 404 error when transaction not found', async () => {
      const notFoundError = {
        response: { status: 404 },
      };
      mockServer.transactions().transaction().call.mockRejectedValue(notFoundError);

      await expect(service.monitorTransaction('missing-hash')).rejects.toThrow(
        'Transaction missing-hash not found on testnet network',
      );
    });

    it('should handle network connection errors', async () => {
      const networkError = {
        code: 'ECONNREFUSED',
      };
      mockServer.transactions().transaction().call.mockRejectedValue(networkError);

      await expect(service.monitorTransaction('test-hash')).rejects.toThrow(
        'Network connection failed for testnet: Unable to reach Horizon server',
      );
    });

    it('should retry on failure and succeed on subsequent attempt', async () => {
      const mockTransaction = { ledger: 12345, hash: 'test-hash' };

      mockServer
        .transactions()
        .transaction()
        .call.mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue(mockTransaction);

      const result = await service.monitorTransaction('test-hash');

      expect(result).toEqual(mockTransaction);
      expect(mockServer.transactions().transaction().call).toHaveBeenCalledTimes(2);
    });

    it('should fail after exhausting retry attempts', async () => {
      mockServer
        .transactions()
        .transaction()
        .call.mockRejectedValue(new Error('Persistent failure'));

      await expect(service.monitorTransaction('test-hash')).rejects.toThrow('Persistent failure');

      // Should try initial attempt + configured retries
      expect(mockServer.transactions().transaction().call).toHaveBeenCalledTimes(2);
    });

    it('should timeout after configured timeout period', async () => {
      // Mock a call that never resolves
      mockServer
        .transactions()
        .transaction()
        .call.mockImplementation(
          () => new Promise(() => {}), // Never resolves
        );

      await expect(service.monitorTransaction('test-hash')).rejects.toThrow(
        /Operation.*timed out after 5000ms/,
      );
    });

    it('should use specific network when provided', async () => {
      const mockMainnetServer = {
        transactions: jest.fn().mockReturnValue({
          transaction: jest.fn().mockReturnValue({
            call: jest.fn().mockResolvedValue({ ledger: 54321, hash: 'mainnet-hash' }),
          }),
        }),
      };

      (Horizon.Server as jest.Mock).mockImplementation((url) => {
        if (url === 'https://horizon.stellar.org') {
          return mockMainnetServer;
        }
        return mockServer;
      });

      const result = await service.monitorTransaction('test-hash', 'mainnet');

      expect(Horizon.Server).toHaveBeenCalledWith('https://horizon.stellar.org');
      expect(result.hash).toBe('mainnet-hash');
    });
  });
});
