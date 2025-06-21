import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus, NotificationType } from '../entities/notification.entity';

export interface NotificationStats {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  deliveryRate: number;
  typeBreakdown: Record<NotificationType, number>;
  platformBreakdown: Record<string, number>;
  dailyStats: Array<{
    date: string;
    sent: number;
    failed: number;
  }>;
}

@Injectable()
export class NotificationAnalyticsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>
  ) {}

  async getNotificationStats(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<NotificationStats> {
    const whereClause: any = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    if (userId) {
      whereClause.userId = userId;
    }

    const notifications = await this.notificationRepository.find({
      where: whereClause
    });

    const totalSent = notifications.filter(n => n.status === NotificationStatus.SENT).length;
    const totalFailed = notifications.filter(n => n.status === NotificationStatus.FAILED).length;
    const totalPending = notifications.filter(n => n.status === NotificationStatus.PENDING).length;
    const deliveryRate = totalSent / (totalSent + totalFailed) * 100 || 0;

    const typeBreakdown = notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>);

    const platformBreakdown = notifications.reduce((acc, notification) => {
      acc[notification.platform] = (acc[notification.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dailyStats = this.generateDailyStats(notifications);

    return {
      totalSent,
      totalFailed,
      totalPending,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      typeBreakdown,
      platformBreakdown,
      dailyStats
    };
  }

  private generateDailyStats(notifications: Notification[]) {
    const dailyMap = new Map<string, { sent: number; failed: number }>();
    
    notifications.forEach(notification => {
      const date = notification.createdAt.toISOString().split('T')[0];
      const stats = dailyMap.get(date) || { sent: 0, failed: 0 };
      
      if (notification.status === NotificationStatus.SENT) {
        stats.sent++;
      } else if (notification.status === NotificationStatus.FAILED) {
        stats.failed++;
      }
      
      dailyMap.set(date, stats);
    });

    return Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getTopFailureReasons(limit: number = 10): Promise<Array<{ reason: string; count: number }>> {
    const notifications = await this.notificationRepository.find({
      where: { status: NotificationStatus.FAILED },
      select: ['errorMessage']
    });

    const reasonMap = new Map<string, number>();
    
    notifications.forEach(notification => {
      const reason = notification.errorMessage || 'Unknown error';
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
    });

    return Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
