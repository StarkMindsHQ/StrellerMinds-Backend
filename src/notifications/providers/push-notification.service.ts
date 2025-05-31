import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as firebase from 'firebase-admin';

export interface PushNotificationOptions {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: firebase.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Initialize Firebase Admin SDK
      const serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT');

      if (!serviceAccount) {
        this.logger.warn(
          'Firebase service account not configured, push notifications disabled',
        );
        return;
      }

      let parsedServiceAccount;

      try {
        parsedServiceAccount = JSON.parse(serviceAccount);
      } catch (e) {
        this.logger.error('Invalid Firebase service account JSON');
        return;
      }

      this.firebaseApp = firebase.initializeApp({
        credential: firebase.credential.cert(parsedServiceAccount),
      });

      this.logger.log('Firebase initialized for push notifications');
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase: ${error.message}`);
    }
  }

  async sendPushNotification(options: PushNotificationOptions): Promise<void> {
    try {
      if (!this.firebaseApp) {
        this.logger.warn(
          'Firebase not initialized, skipping push notification',
        );
        return;
      }

      const { tokens, title, body, data } = options;

      if (!tokens.length) {
        this.logger.warn('No tokens provided for push notification');
        return;
      }

      const message: firebase.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data ? this.stringifyData(data) : undefined,
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              badge: 1,
            },
          },
        },
      };

      const response = await firebase.messaging().sendEachForMulticast(message);

      this.logger.log(
        `Push notification sent: ${response.successCount} successful, ${response.failureCount} failed`,
      );

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            this.logger.warn(
              `Failed to send to token ${tokens[idx]}: ${resp.error?.message}`,
            );
          }
        });

        // TODO: Handle failed tokens (e.g., remove invalid tokens)
      }
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      throw error;
    }
  }

  private stringifyData(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }

    return result;
  }
}
