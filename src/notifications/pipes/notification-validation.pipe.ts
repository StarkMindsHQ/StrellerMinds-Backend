import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { CreateNotificationDto, NotificationPlatform } from '../dto/create-notification.dto';

@Injectable()
export class NotificationValidationPipe implements PipeTransform {
  transform(value: CreateNotificationDto, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      return value;
    }

    if (!value.title || value.title.trim().length === 0) {
      throw new BadRequestException('Notification title is required');
    }

    if (!value.body || value.body.trim().length === 0) {
      throw new BadRequestException('Notification body is required');
    }

    if (value.title.length > 100) {
      throw new BadRequestException('Notification title must be less than 100 characters');
    }

    if (value.body.length > 500) {
      throw new BadRequestException('Notification body must be less than 500 characters');
    }

    if (!Object.values(NotificationPlatform).includes(value.platform as unknown as NotificationPlatform)) {
      throw new BadRequestException('Invalid notification platform');
    }

    if (value.scheduledAt) {
      const scheduledDate = new Date(value.scheduledAt);
      if (scheduledDate < new Date()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
    }

    if (value.quietHoursStart && value.quietHoursEnd) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(value.quietHoursStart) || !timeRegex.test(value.quietHoursEnd)) {
        throw new BadRequestException('Invalid quiet hours format. Use HH:MM format');
      }
    }

    return value;
  }
}
