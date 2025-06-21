export interface NotificationConfig {
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  rateLimit: {
    maxNotificationsPerHour: number;
    maxBulkNotificationsPerDay: number;
  };
  retry: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  cleanup: {
    retentionDays: number;
    batchSize: number;
  };
}

export const notificationConfig = (): NotificationConfig => ({
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },
  rateLimit: {
    maxNotificationsPerHour: parseInt(process.env.MAX_NOTIFICATIONS_PER_HOUR || '50'),
    maxBulkNotificationsPerDay: parseInt(process.env.MAX_BULK_NOTIFICATIONS_PER_DAY || '10'),
  },
  retry: {
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3'),
    backoffMultiplier: parseInt(process.env.NOTIFICATION_BACKOFF_MULTIPLIER || '2'),
  },
  cleanup: {
    retentionDays: parseInt(process.env.NOTIFICATION_RETENTION_DAYS || '30'),
    batchSize: parseInt(process.env.NOTIFICATION_CLEANUP_BATCH_SIZE || '100'),
  }