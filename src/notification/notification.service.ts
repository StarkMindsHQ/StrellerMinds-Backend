import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class MobileNotificationService {
  async sendPush(token: string, title: string, body: string) {
    await admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
    });
  }
}