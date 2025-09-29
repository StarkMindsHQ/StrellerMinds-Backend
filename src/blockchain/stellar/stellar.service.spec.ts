import { Test, TestingModule } from '@nestjs/testing';
import { StellarService } from './stellar.service';

// Import your mock
import { mockStellarSdk } from '../../test/mocks/stellar-sdk.mock';

// Override the actual stellar-sdk with the mock
jest.mock('stellar-sdk', () => mockStellarSdk);

describe('StellarService', () => {
  let service: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StellarService],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitTransaction', () => {
    it('should return mocked transaction hash', async () => {
      const result = await (service as any).server.submitTransaction();
      expect(result).toEqual({ hash: 'mocked-hash' });
    });
  });

  describe('loadAccount', () => {
    it('should return mocked account for valid key', async () => {
      const account = await (service as any).server.loadAccount('GVALID');
      expect(account).toEqual({ accountId: 'GVALID', sequence: '123' });
    });

    it('should throw error for invalid key', async () => {
      await expect((service as any).server.loadAccount('GINVALID')).rejects.toThrow('Account not found');
    });
  });
});
