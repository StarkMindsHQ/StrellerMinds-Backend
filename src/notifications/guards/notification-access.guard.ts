import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const notificationId = request.params.id;

    if (!user || !notificationId) {
      throw new ForbiddenException('Access denied');
    }

    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId }
    });

    if (!notification) {
      throw new ForbiddenException('Notification not found');
    }

    if (notification.userId && notification.userId !== user.id) {
      throw new ForbiddenException('Access denied to this notification');
    }

    return true;
  }
}
