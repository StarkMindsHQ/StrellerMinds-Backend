import { SetMetadata } from '@nestjs/common';
import { WebhookProvider } from '../interfaces/webhook.interfaces';

export const WEBHOOK_PROVIDER_KEY = 'webhook_provider';

/**
 * Decorator to specify webhook provider for a route
 */
export const SetWebhookProvider = (provider: WebhookProvider) =>
  SetMetadata(WEBHOOK_PROVIDER_KEY, provider);
