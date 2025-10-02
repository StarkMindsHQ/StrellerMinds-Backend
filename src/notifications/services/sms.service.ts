import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly isSmsEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isSmsEnabled = this.configService.get<boolean>('SMS_NOTIFICATIONS_ENABLED', false);
  }

  async sendSms(toPhoneNumber: string, message: string): Promise<boolean> {
    if (!this.isSmsEnabled) {
      this.logger.warn('SMS notifications are disabled. Skipping SMS send.');
      return false;
    }

    try {
      // In a real application, integrate with an SMS service provider (e.g., Twilio, Nexmo)
      this.logger.log(`Sending SMS to ${toPhoneNumber}: "${message.substring(0, 50)}..."`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Simulate success/failure
      const success = Math.random() > 0.05; // 95% success rate
      if (success) {
        this.logger.log(`SMS sent successfully to ${toPhoneNumber}`);
        return true;
      } else {
        this.logger.error(`Failed to send SMS to ${toPhoneNumber}: Simulated error`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error sending SMS to ${toPhoneNumber}: ${error.message}`, error.stack);
      return false;
    }
  }
}
