import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { WalletInfo } from '../entities/wallet-info.entity';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserProgress } from '../entities/user-progress.entity';
import { UserDeletionService } from './users.deletion.service';
import { AuditLogService } from 'src/audit/services/audit.log.service';
import { AccountDeletionConfirmationService } from './account.deletion.confirmation.service';
import { AccountStatus } from '../enums/accountStatus.enum';

describe('UserDeletionService', () => {
  let service: UserDeletionService;
  let userRepository: Repository<User>;
  let walletInfoRepository: Repository<WalletInfo>;
  let userProgressRepository: Repository<UserProgress>;
  let auditLogService: AuditLogService;
  let confirmationService: AccountDeletionConfirmationService;
  let connection: Connection;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      update: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDeletionService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WalletInfo),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserProgress),
          useValue: {
            delete: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            createLog: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: AccountDeletionConfirmationService,
          useValue: {
            startDeletionConfirmationWorkflow: jest.fn().mockResolvedValue(undefined),
            validateDeletionConfirmation: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => {
              if (key === 'DATA_RETENTION_PERIOD') return 30;
              return defaultValue;
            }),
          },
        },
        {
          provide: Connection,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<UserDeletionService>(UserDeletionService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    walletInfoRepository = module.get<Repository<WalletInfo>>(getRepositoryToken(WalletInfo));
    userProgressRepository = module.get<Repository<UserProgress>>(getRepositoryToken(UserProgress));
    auditLogService = module.get<AuditLogService>(AuditLogService);
    confirmationService = module.get<AccountDeletionConfirmationService>(
      AccountDeletionConfirmationService,
    );
    connection = module.get<Connection>(Connection);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deactivateAccount', () => {
    it('should deactivate user account', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await service.deactivateAccount('user-id', 'requester-id');

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith({
        ...mockUser,
        status: AccountStatus.DEACTIVATED,
        deactivatedAt: expect.any(Date),
      });
      expect(auditLogService.createLog).toHaveBeenCalledWith({
        action: 'ACCOUNT_DEACTIVATION',
        entityType: 'USER',
        entityId: 'user-id',
        performedBy: 'requester-id',
        details: expect.any(Object),
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deactivateAccount('non-existent-id', 'requester-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rollback transaction on error', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(mockQueryRunner.manager, 'save').mockRejectedValue(new Error('Database error'));

      await expect(service.deactivateAccount('user-id', 'requester-id')).rejects.toThrow(
        'Database error',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('requestAccountDeletion', () => {
    it('should start deletion workflow', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'STUDENT',
      };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await service.requestAccountDeletion('user-id', 'user-id');

      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        status: AccountStatus.PENDING_DELETION,
        deletionRequestedAt: expect.any(Date),
      });
      expect(confirmationService.startDeletionConfirmationWorkflow).toHaveBeenCalledWith('user-id');
      expect(auditLogService.createLog).toHaveBeenCalled();
    });

    it('should throw error if user tries to delete another user without admin rights', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'STUDENT',
      };
      const mockRequester = {
        id: 'requester-id',
        email: 'requester@example.com',
        role: 'STUDENT',
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockRequester as any);

      await expect(service.requestAccountDeletion('user-id', 'requester-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmAccountDeletion', () => {
    it('should confirm and perform deletion with valid token', async () => {
      jest.spyOn(confirmationService, 'validateDeletionConfirmation').mockResolvedValue(true);
      jest.spyOn(service as any, 'performAccountDeletion').mockResolvedValue(undefined);

      await service.confirmAccountDeletion('user-id', 'valid-token');

      expect(confirmationService.validateDeletionConfirmation).toHaveBeenCalledWith(
        'user-id',
        'valid-token',
      );
      expect((service as any).performAccountDeletion).toHaveBeenCalledWith('user-id', 'user-id');
    });

    it('should throw error with invalid token', async () => {
      jest.spyOn(confirmationService, 'validateDeletionConfirmation').mockResolvedValue(false);

      await expect(service.confirmAccountDeletion('user-id', 'invalid-token')).rejects.toThrow(
        BadRequestException,
      );

      expect((service as any).performAccountDeletion).not.toHaveBeenCalled();
    });
  });

  describe('performAccountDeletion', () => {
    it('should perform full deletion process', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockWallet = { id: 'wallet-id', walletAddress: '0x123' };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(walletInfoRepository, 'findOne').mockResolvedValue(mockWallet as any);
      jest.spyOn(service as any, 'scheduleDataPurge').mockImplementation(() => {});

      await service.performAccountDeletion('user-id', 'requester-id');

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        User,
        'user-id',
        expect.objectContaining({
          firstName: '[REDACTED]',
          lastName: '[REDACTED]',
        }),
      );

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        WalletInfo,
        'wallet-id',
        expect.objectContaining({
          orphaned: true,
          orphanedAt: expect.any(Date),
        }),
      );

      expect(mockQueryRunner.manager.softDelete).toHaveBeenCalledWith(UserProgress, {
        user: { id: 'user-id' },
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(auditLogService.createLog).toHaveBeenCalled();
      expect((service as any).scheduleDataPurge).toHaveBeenCalledWith('user-id');
    });
  });
});
