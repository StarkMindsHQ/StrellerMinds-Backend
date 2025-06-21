import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface QueuedNotification {
  id: string;
  payload: any;
  priority: 'low' | 'normal' | 'high';
  maxRetries: number;
  currentRetry: number;
  scheduledAt: Date;
  createdAt: Date;
}

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);
  private queue: QueuedNotification[] = [];
  private processing = false;

  constructor(private configService: ConfigService) {
    setInterval(() => this.processQueue(), 1000);
  }

  async addToQueue(
    payload: any,
    priority: 'low' | 'normal' | 'high' = 'normal',
    scheduledAt: Date = new Date(),
    maxRetries: number = 3
  ): Promise<string> {
    const id = this.generateId();
    
    const queuedNotification: QueuedNotification = {
      id,
      payload,
      priority,
      maxRetries,
      currentRetry: 0,
      scheduledAt,
      createdAt: new Date()
    };

    this.queue.push(queuedNotification);
    this.sortQueue();

    this.logger.log(`Added notification to queue: ${id}`);
    return id;
  }

  private sortQueue(): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    
    this.queue.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    try {
      const now = new Date();
      const readyNotifications = this.queue.filter(n => n.scheduledAt <= now);

      for (const notification of readyNotifications.slice(0, 5)) {
        try {
          await this.processNotification(notification);
          this.removeFromQueue(notification.id);
        } catch (error) {
          await this.handleFailedNotification(notification, error);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async processNotification(notification: QueuedNotification): Promise<void> {
    this.logger.log(`Processing notification: ${notification.id}`);
  }

  private async handleFailedNotification(
    notification: QueuedNotification, 
    error: Error
  ): Promise<void> {
    notification.currentRetry++;

    if (notification.currentRetry >= notification.maxRetries) {
      this.logger.error(`Max retries exceeded for notification: ${notification.id}`, error);
      this.removeFromQueue(notification.id);
    } else {
      notification.scheduledAt = new Date(Date.now() + Math.pow(2, notification.currentRetry) * 1000);
      this.logger.warn(`Retrying notification: ${notification.id} (attempt ${notification.currentRetry})`);
    }
  }

  private removeFromQueue(id: string): void {
    this.queue = this.queue.filter(n => n.id !== id);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getQueueStats(): { total: number; byPriority: Record<string, number> } {
    const byPriority = this.queue.reduce((acc, notification) => {
      acc[notification.priority] = (acc[notification.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.queue.length,
      byPriority
    };
  }
}
