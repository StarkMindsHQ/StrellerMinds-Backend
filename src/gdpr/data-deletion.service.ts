import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeletionRequest, DeletionStatus } from './entities/deletion-request.entity';
import { DataProcessingLog, ProcessingActivity } from './entities/data-processing-log.entity';
import { CreateDeletionRequestDto } from './dto/deletion-request.dto';
import { ConsentService } from './consent.service';

@Injectable()
export class DataDeletionService {
  constructor(
    @InjectRepository(DeletionRequest)
    private deletionRepository: Repository<DeletionRequest>,
    @InjectRepository(DataProcessingLog)
    private logRepository: Repository<DataProcessingLog>,
    private consentService: ConsentService,
  ) {}

  async createDeletionRequest(
    userId: string,
    requestDto: CreateDeletionRequestDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<DeletionRequest> {
    // Check for existing pending requests
    const existingRequest = await this.deletionRepository.findOne({
      where: { userId, status: DeletionStatus.PENDING },
    });

    if (existingRequest) {
      throw new Error('A deletion request is already pending for this user');
    }

    const deletionRequest = this.deletionRepository.create({
      userId,
      ...requestDto,
      scheduledAt: requestDto.scheduledAt ? new Date(requestDto.scheduledAt) : null,
    });

    const saved = await this.deletionRepository.save(deletionRequest);

    // Log the deletion request
    await this.logDataProcessing(
      userId,
      ProcessingActivity.DATA_DELETION,
      'Data deletion request created',
      { requestId: saved.id, reason: requestDto.reason },
      ipAddress,
      userAgent,
    );

    return saved;
  }

  async processDeletionRequest(requestId: string): Promise<void> {
    const request = await this.deletionRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Deletion request not found');
    }

    try {
      await this.deletionRepository.update(requestId, {
        status: DeletionStatus.IN_PROGRESS,
      });

      // Perform the actual deletion
      await this.deleteUserData(request.userId, request.dataTypes);

      await this.deletionRepository.update(requestId, {
        status: DeletionStatus.COMPLETED,
        completedAt: new Date(),
      });

      // Log completion
      await this.logDataProcessing(
        request.userId,
        ProcessingActivity.DATA_DELETION,
        'Data deletion completed',
        { requestId },
        '127.0.0.1', // System IP
        'GDPR Service',
      );
    } catch (error) {
      await this.deletionRepository.update(requestId, {
        status: DeletionStatus.FAILED,
        notes: error.message,
      });
      throw error;
    }
  }

  private async deleteUserData(userId: string, dataTypes?: string[]): Promise<void> {
    // Delete user consents
    if (!dataTypes || dataTypes.includes('consents')) {
      await this.consentService.withdrawAllConsents(userId);
    }

    // Delete user profile data (implement based on your entities)
    if (!dataTypes || dataTypes.includes('profile')) {
      await this.deleteUserProfile(userId);
    }

    // Delete activity logs (keep deletion logs for compliance)
    if (!dataTypes || dataTypes.includes('activity')) {
      await this.logRepository.delete({
        userId,
        activity: ProcessingActivity.DATA_ACCESS,
      });
    }

    // Add more deletion logic based on your application's data model
  }

  private async deleteUserProfile(userId: string): Promise<void> {
    // Implement based on your User entity and related data
    console.log(`Deleting profile data for user: ${userId}`);
  }

  async getDeletionRequests(userId: string): Promise<DeletionRequest[]> {
    return this.deletionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  private async logDataProcessing(
    userId: string,
    activity: ProcessingActivity,
    description: string,
    metadata: any,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const log = this.logRepository.create({
      userId,
      activity,
      description,
      metadata,
      ipAddress,
      userAgent,
    });

    await this.logRepository.save(log);
  }
}
