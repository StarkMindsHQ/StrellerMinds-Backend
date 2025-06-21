import { NotificationPlatform } from '../dto/create-notification.dto';

export class NotificationUtils {
  static validateDeviceToken(token: string, platform: NotificationPlatform): boolean {
    if (!token || token.trim().length === 0) {
      return false;
    }

    switch (platform) {
      case NotificationPlatform.IOS:
        return /^[a-f0-9]{64}$/i.test(token) || token.length > 100;
      case NotificationPlatform.ANDROID:
        return token.startsWith('f') || token.startsWith('c') || token.startsWith('d');
      case NotificationPlatform.WEB:
        return token.length > 100 && token.includes(':');
      default:
        return token.length > 10;
    }
  }

  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  static sanitizeNotificationData(data: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        sanitized[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    
    return sanitized;
  }

  static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  static parseQuietHours(start: string, end: string): { startMinutes: number; endMinutes: number } {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    return {
      startMinutes: startHour * 60 + startMin,
      endMinutes: endHour * 60 + endMin
    };
  }

  static generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getPlatformSpecificConfig(platform: NotificationPlatform) {
    switch (platform) {
      case NotificationPlatform.IOS:
        return {
          sound: 'default',
          badge: 1,
          mutableContent: true
        };
      case NotificationPlatform.ANDROID:
        return {
          priority: 'high',
          sound: 'default',
          vibrate: [200, 100, 200]
        };
      case NotificationPlatform.WEB:
        return {
          icon: '/assets/icon-192x192.png',
          requireInteraction: false,
          silent: false
        };
      default:
        return {};
    }
  }
}