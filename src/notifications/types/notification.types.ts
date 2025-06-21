export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  clickAction?: string;
  data?: Record<string, any>;
}

export interface NotificationBatch {
  tokens: string[];
  payload: PushNotificationPayload;
  platform: string;
}

export interface NotificationDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  token?: string;
}

export interface NotificationMetrics {
  sent: number;
  failed: number;
  pending: number;
  cancelled: number;
}