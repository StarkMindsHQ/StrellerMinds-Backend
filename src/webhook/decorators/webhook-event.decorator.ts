import { SetMetadata } from '@nestjs/common';

export const WEBHOOK_EVENT_KEY = 'webhook_event';

export const WebhookEvent = (
  event: string,
  options?: {
    extractEntityId?: (data: any) => string;
    extractEntityType?: (data: any) => string;
    transformData?: (data: any) => any;
  },
) => SetMetadata(WEBHOOK_EVENT_KEY, { event, ...options });
