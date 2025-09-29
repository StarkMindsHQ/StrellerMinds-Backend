import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { WalletService } from '../src/wallet/services/wallet.service';
import { Wallet, WalletType } from '../src/wallet/entities/wallet.entity';
import { Credential } from '../src/wallet/entities/credential.entity';
import { EthereumWalletProvider } from '../src/wallet/providers/ethereum-wallet.provider';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: any;
  let credentialRepository: any;
  let jwtService: JwtService;

  const mockWalletRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCredentialRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockEthereumProvider = {
    verifySignature: jest.fn(),
    generateNonce: jest.fn(),
    formatMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletRepository,
        },
        {
          provide: getRepositoryToken(Credential),
          useValue: mockCredentialRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EthereumWalletProvider,
          useValue: mockEthereumProvider,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get(getRepositoryToken(Wallet));
    credentialRepository = module.get(getRepositoryToken(Credential));
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('connectWallet', () => {
    it('should connect a new wallet successfully', async () => {
      const connectDto = {
        address: '0x1234567890123456789012345678901234567890',
        type: WalletType.METAMASK,
        signature: 'mock-signature',
        message: 'mock-message',
      };

      mockEthereumProvider.verifySignature.mockResolvedValue(true);
      mockWalletRepository.findOne.mockResolvedValue(null);
      mockWalletRepository.create.mockReturnValue({
        id: 'wallet-id',
        address: connectDto.address.toLowerCase(),
        type: connectDto.type,
      });
      mockWalletRepository.save.mockResolvedValue({
        id: 'wallet-id',
        address: connectDto.address.toLowerCase(),
        type: connectDto.type,
      });
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.connectWallet(connectDto);

      expect(result.isNewWallet).toBe(true);
      expect(result.accessToken).toBe('jwt-token');
      expect(mockEthereumProvider.verifySignature).toHaveBeenCalledWith(
        connectDto.address,
        connectDto.message,
        connectDto.signature
      );
    });

    it('should throw UnauthorizedException for invalid signature', async () => {
      const connectDto = {
        address: '0x1234567890123456789012345678901234567890',
        type: WalletType.METAMASK,
        signature: 'invalid-signature',
        message: 'mock-message',
      };

      mockEthereumProvider.verifySignature.mockResolvedValue(false);

      await expect(service.connectWallet(connectDto)).rejects.toThrow(
        'Invalid wallet signature'
      );
    });
  });

  describe('shareCredentials', () => {
    it('should share credentials successfully', async () => {
      const walletId = 'wallet-id';
      const shareDto = {
        credentialIds: ['cred-1', 'cred-2'],
        recipientAddress: '0x9876543210987654321098765432109876543210',
      };

      const mockCredentials = [
        { id: 'cred-1', walletId },
        { id: 'cred-2', walletId },
      ];

      mockCredentialRepository.find.mockResolvedValue(mockCredentials);
      mockCredentialRepository.save.mockResolvedValue({});

      const result = await service.shareCredentials(walletId, shareDto);

      expect(result.success).toBe(true);
      expect(result.sharedCredentials).toEqual(['cred-1', 'cred-2']);
      expect(mockCredentialRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});
