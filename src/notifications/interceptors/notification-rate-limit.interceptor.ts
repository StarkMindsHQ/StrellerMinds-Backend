import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationRateLimitInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    
    if (userId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentNotifications = await this.notificationRepository.count({
        where: {
          userId,
          createdAt: { $gte: oneHourAgo } as any
        }
      });

      if (recentNotifications >= 50) {
        throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    return next.handle();
  }
}
