import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { User } from '../entities/user.entity';
import { WalletInfo } from '../entities/wallet-info.entity';
import { UserProgress } from '../entities/user-progress.entity';
import { ConfigService } from '@nestjs/config';
import { AccountStatus } from '../enums/accountStatus.enum';
import { AuditLogService } from 'src/audit/services/audit.log.service';
import { AccountDeletionConfirmationService } from './account.deletion.confirmation.service';



/**
 * Service responsible for handling user account deletion process
 */
@Injectable()
export class UserDeletionService {
  private readonly logger = new Logger(UserDeletionService.name);
  private readonly dataRetentionPeriod: number;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WalletInfo)
    private readonly walletInfoRepository: Repository<WalletInfo>,
    @InjectRepository(UserProgress)
    private readonly userProgressRepository: Repository<UserProgress>,
    private readonly auditLogService: AuditLogService,
    private readonly confirmationService: AccountDeletionConfirmationService,
    private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {
    // Get data retention period from config (days)
    this.dataRetentionPeriod = this.configService.get<number>(
      'DATA_RETENTION_PERIOD',
      30,
    );
  }

  /**
   * Deactivate a user account
   * @param userId User ID to deactivate
   * @param requestingUserId User ID requesting the deactivation
   */
  async deactivateAccount(
    userId: string,
    requestingUserId: string,
  ): Promise<void> {
    const user = await this.findUserOrFail(userId);

    // Begin transaction
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Add status column to track account state
      user['status'] = AccountStatus.DEACTIVATED;
      user['deactivatedAt'] = new Date();

      await queryRunner.manager.save(user);

      // Log the deactivation
      await this.auditLogService.createLog({
        action: 'ACCOUNT_DEACTIVATION',
        entityType: 'USER',
        entityId: userId,
        performedBy: requestingUserId,
        details: {
          timestamp: new Date().toISOString(),
        },
      });

      await queryRunner.commitTransaction();
      this.logger.log(`Account ${userId} has been deactivated`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to deactivate account ${userId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Request account deletion and start confirmation workflow
   * @param userId User ID to delete
   * @param requestingUserId User ID requesting the deletion
   */
  async requestAccountDeletion(
    userId: string,
    requestingUserId: string,
  ): Promise<void> {
    const user = await this.findUserOrFail(userId);

    // Ensure user is authorized to delete this account
    if (userId !== requestingUserId) {
      const requestingUser = await this.findUserOrFail(requestingUserId);
      if (requestingUser.role !== 'ADMIN') {
        throw new BadRequestException(
          'You are not authorized to delete this account',
        );
      }
    }

    // Mark account as pending deletion
    user['status'] = AccountStatus.PENDING_DELETION;
    user['deletionRequestedAt'] = new Date();
    await this.userRepository.save(user);

    // Start confirmation workflow
    const confirmationUrl = `${this.configService.get<string>('FRONTEND_URL')}/confirm-deletion?userId=${user.id}`;
    const unsubscribeUrl = `${this.configService.get<string>('FRONTEND_URL')}/preferences?email=${user.email}`;

    await this.confirmationService.sendAccountDeletionEmail({
      email: user.email,
      firstName: user.firstName,
      confirmationUrl,
      unsubscribeUrl,
    });

    // Log deletion request
    await this.auditLogService.createLog({
      action: 'ACCOUNT_DELETION_REQUESTED',
      entityType: 'USER',
      entityId: userId,
      performedBy: requestingUserId,
      details: {
        timestamp: new Date().toISOString(),
      },
    });

    this.logger.log(`Account deletion requested for user ${userId}`);
  }

  /**
   * Confirm account deletion with token
   * @param userId User ID to delete
   * @param confirmationToken Confirmation token
   */
  async confirmAccountDeletion(
    userId: string,
    confirmationToken: string,
  ): Promise<void> {
    // Validate confirmation token
    const isValid = await this.confirmationService.validateAndDeleteAccount(confirmationToken,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    await this.performAccountDeletion(userId, userId);
  }

  /**
   * Perform the actual account deletion process
   * @param userId User ID to delete
   * @param requestingUserId User ID requesting the deletion
   */
  async performAccountDeletion(
    userId: string,
    requestingUserId: string,
  ): Promise<void> {
    const user = await this.findUserOrFail(userId);

    // Begin transaction for atomic operations
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Scrub sensitive user data but preserve the record for soft deletion
      await this.scrubUserData(userId, queryRunner);

      // Preserve blockchain credentials but mark as orphaned
      await this.preserveBlockchainCredentials(userId, queryRunner);

      // Soft delete related entities
      await queryRunner.manager.softDelete(UserProgress, {
        user: { id: userId },
      });

      // Soft delete the user entity
      user['status'] = AccountStatus.DELETED;
      user['deletedAt'] = new Date();
      await queryRunner.manager.save(user);

      // Log the deletion
      await this.auditLogService.createLog({
        action: 'ACCOUNT_DELETED',
        entityType: 'USER',
        entityId: userId,
        performedBy: requestingUserId,
        details: {
          timestamp: new Date().toISOString(),
          retentionPeriod: this.dataRetentionPeriod,
        },
      });

      await queryRunner.commitTransaction();
      this.logger.log(`Account ${userId} has been deleted and data scrubbed`);

      // Schedule final purge after retention period
      this.scheduleDataPurge(userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to delete account ${userId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Scrub sensitive user data but preserve the record
   * @param userId User ID to scrub
   * @param queryRunner Transaction query runner
   */
  private async scrubUserData(userId: string, queryRunner: any): Promise<void> {
    // Keep user ID but scrub personal information
    await queryRunner.manager.update(User, userId, {
      firstName: '[REDACTED]',
      lastName: '[REDACTED]',
      email: `deleted-${userId}@redacted.user`,
      bio: null,
      profilePicture: null,
      // Don't delete password hash as it's needed for security audit purposes
    });
  }

  /**
   * Preserve blockchain credentials for compliance and access purposes
   * @param userId User ID
   * @param queryRunner Transaction query runner
   */
  private async preserveBlockchainCredentials(
    userId: string,
    queryRunner: any,
  ): Promise<void> {
    const walletInfo = await this.walletInfoRepository.findOne({
      where: { user: { id: userId } },
    });

    if (walletInfo) {
      // Mark wallet as orphaned but preserve the blockchain data
      await queryRunner.manager.update(WalletInfo, walletInfo.id, {
        orphaned: true,
        orphanedAt: new Date(),
        // Keep blockchain credentials for compliance
      });

      this.logger.log(`Blockchain credentials preserved for user ${userId}`);
    }
  }

  /**
   * Schedule complete data purge after retention period
   * @param userId User ID to purge
   */
  private scheduleDataPurge(userId: string): void {
    const purgeDate = new Date();
    purgeDate.setDate(purgeDate.getDate() + this.dataRetentionPeriod);

    this.logger.log(
      `Scheduling complete data purge for user ${userId} on ${purgeDate.toISOString()}`,
    );

    // For production, you might want to use a job scheduler like Bull
    // This is a simplified version for demonstration
    setTimeout(
      async () => {
        await this.purgeUserData(userId);
      },
      this.dataRetentionPeriod * 24 * 60 * 60 * 1000,
    );
  }

  /**
   * Completely purge user data after retention period
   * @param userId User ID to purge
   */
  async purgeUserData(userId: string): Promise<void> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Hard delete related entities first
      await queryRunner.manager.delete(UserProgress, { user: { id: userId } });

      // Check if blockchain credentials should be permanently deleted
      // This depends on your regulatory requirements
      const walletInfo = await this.walletInfoRepository.findOne({
        where: { user: { id: userId } },
      });

      if (walletInfo && this.shouldPurgeBlockchainData(walletInfo)) {
        await queryRunner.manager.delete(WalletInfo, walletInfo.id);
      }

      // Finally hard delete the user
      await queryRunner.manager.delete(User, userId);

      await queryRunner.commitTransaction();

      // Log the permanent deletion
      await this.auditLogService.createLog({
        action: 'ACCOUNT_PURGED',
        entityType: 'USER',
        entityId: userId,
        performedBy: 'SYSTEM',
        details: {
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log(`User data for ${userId} has been permanently purged`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to purge user data for ${userId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Determine if blockchain data should be purged based on regulations
   * @param walletInfo Wallet information
   */
  private shouldPurgeBlockchainData(walletInfo: WalletInfo): boolean {
    // This logic should be implemented based on your specific regulatory requirements
    // For example, you might need to keep some data for tax purposes
    // GDPR allows keeping data needed for legal obligations

    // For demonstration, we're returning false to preserve blockchain data
    return false;
  }

  /**
   * Utility method to find a user or throw exception
   * @param userId User ID to find
   */
  private async findUserOrFail(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }
}
