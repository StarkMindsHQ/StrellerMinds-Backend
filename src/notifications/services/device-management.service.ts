import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceToken } from '../entities/device-token.entity';
import { NotificationPlatform } from '../dto/create-notification.dto';

@Injectable()
export class DeviceManagementService {
  private readonly logger = new Logger(DeviceManagementService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>
  ) {}

  async getUserDevices(userId: string): Promise<DeviceToken[]> {
    return await this.deviceTokenRepository.find({
      where: { userId, active: true },
      order: { lastUsedAt: 'DESC' }
    });
  }

  async updateDeviceLastUsed(token: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { token },
      { lastUsedAt: new Date() }
    );
  }

 
  async deactivateDevice(userId: string, deviceId: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { userId, deviceId },
      { active: false }
    );
  }

  async getDeviceStats(): Promise<{
    totalDevices: number;
    activeDevices: number;
    devicesByPlatform: Record<NotificationPlatform, number>;
  }> {
    const [totalDevices, activeDevices, allDevices] = await Promise.all([
      this.deviceTokenRepository.count(),
      this.deviceTokenRepository.count({ where: { active: true } }),
      this.deviceTokenRepository.find({ select: ['platform'] })
    ]);

    const devicesByPlatform = allDevices.reduce((acc, device) => {
      acc[device.platform] = (acc[device.platform] || 0) + 1;
      return acc;
    }, {} as Record<NotificationPlatform, number>);

    return { totalDevices, activeDevices, devicesByPlatform };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupStaleDevices(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await this.deviceTokenRepository.update(
      { 
        lastUsedAt: { $lte: thirtyDaysAgo } as any,
        active: true 
      },
      { active: false }
    );

    if (result.affected > 0) {
      this.logger.log(`Deactivated ${result.affected} stale device tokens`);
    }
  }

  async bulkUpdateDeviceTokens(
    oldTokens: string[],
    newTokens: string[]
  ): Promise<void> {
    if (oldTokens.length !== newTokens.length) {
      throw new Error('Old and new token arrays must have the same length');
    }

    for (let i = 0; i < oldTokens.length; i++) {
      await this.deviceTokenRepository.update(
        { token: oldTokens[i] },
        { token: newTokens[i], lastUsedAt: new Date() }
      );
    }
  }
}
