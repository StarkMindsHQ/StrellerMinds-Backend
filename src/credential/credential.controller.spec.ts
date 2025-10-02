import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CredentialController } from '../credential.controller';
import { CredentialService } from '../credential.service';
import { CredentialStatus } from '../dto/credential-history-query.dto';

describe('CredentialController', () => {
  let controller: CredentialController;
  let service: CredentialService;

  const mockCredentialService = {
    getUserCredentialHistory: jest.fn(),
    verifyCredential: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CredentialController],
      providers: [
        {
          provide: CredentialService,
          useValue: mockCredentialService,
        },
      ],
    }).compile();

    controller = module.get<CredentialController>(CredentialController);
    service = module.get<CredentialService>(CredentialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCredentialHistory', () => {
    it('should return credential history for the authenticated user', async () => {
      const user = { id: 'user-123' };
      const queryParams = {
        page: 1,
        limit: 10,
        status: CredentialStatus.ALL,
      };
      const expectedResponse = {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'academic',
            name: 'Computer Science Degree',
            // other fields...
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
        },
      };

      mockCredentialService.getUserCredentialHistory.mockResolvedValue(expectedResponse);

      const result = await controller.getCredentialHistory(user, queryParams);

      expect(service.getUserCredentialHistory).toHaveBeenCalledWith('user-123', queryParams);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle errors from service', async () => {
      const user = { id: 'user-123' };
      const queryParams = {
        page: 1,
        limit: 10,
      };

      mockCredentialService.getUserCredentialHistory.mockRejectedValue(new Error('Database error'));

      await expect(controller.getCredentialHistory(user, queryParams)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('verifyCredential', () => {
    it('should verify a credential and return the result', async () => {
      const user = { id: 'user-123' };
      const credentialId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedResponse = {
        verified: true,
        credential: {
          id: credentialId,
          // other fields...
        },
      };

      mockCredentialService.verifyCredential.mockResolvedValue(expectedResponse);

      const result = await controller.verifyCredential(user, credentialId);

      expect(service.verifyCredential).toHaveBeenCalledWith('user-123', credentialId);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle not found errors', async () => {
      const user = { id: 'user-123' };
      const credentialId = 'non-existent-id';

      mockCredentialService.verifyCredential.mockRejectedValue(
        new HttpException('Credential not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.verifyCredential(user, credentialId)).rejects.toThrow(HttpException);
    });
  });
});
