import { SetMetadata } from '@nestjs/common';
import { NotificationType } from '../entities/notification.entity';

export const NOTIFICATION_TYPE_KEY = 'notificationType';
export const RequireNotificationType = (type: NotificationType) => 
  SetMetadata(NOTIFICATION_TYPE_KEY, type);