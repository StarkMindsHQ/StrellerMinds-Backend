/**
 * Integration Event Bus
 * Handles webhook events, internal events, and workflow triggers
 */

import { IntegrationEvent, generateId } from './base';

type EventHandler = (event: IntegrationEvent) => Promise<void>;

export interface EventBusOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  deadLetterQueueSize?: number;
}

export class IntegrationEventBus {
  private handlers = new Map<string, EventHandler[]>();
  private deadLetterQueue: IntegrationEvent[] = [];
  private options: Required<EventBusOptions>;
  private processingEvents = new Set<string>();

  constructor(options: EventBusOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
      deadLetterQueueSize: options.deadLetterQueueSize ?? 100,
    };
  }

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType) ?? [];
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    };
  }

  subscribeAll(handler: EventHandler): () => void {
    return this.subscribe('*', handler);
  }

  async publish(
    integrationId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<IntegrationEvent> {
    const event: IntegrationEvent = {
      id: generateId(),
      integrationId,
      type,
      payload,
      timestamp: new Date(),
      processed: false,
      retryCount: 0,
    };

    await this.dispatch(event);
    return event;
  }

  async publishWebhook(
    rawBody: string,
    integrationId: string,
    eventType: string,
    signature?: string,
  ): Promise<IntegrationEvent> {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { raw: rawBody };
    }

    return this.publish(integrationId, eventType, {
      ...payload,
      _webhookSignature: signature,
      _receivedAt: new Date().toISOString(),
    });
  }

  private async dispatch(event: IntegrationEvent): Promise<void> {
    if (this.processingEvents.has(event.id)) return;
    this.processingEvents.add(event.id);

    const specificHandlers = this.handlers.get(event.type) ?? [];
    const wildcardHandlers = this.handlers.get('*') ?? [];
    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    const promises = allHandlers.map((handler) => this.executeWithRetry(handler, event));

    await Promise.allSettled(promises);
    event.processed = true;
    this.processingEvents.delete(event.id);
  }

  private async executeWithRetry(handler: EventHandler, event: IntegrationEvent): Promise<void> {
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        await handler(event);
        return;
      } catch (err) {
        if (attempt === this.options.maxRetries) {
          console.error(`Event handler failed after ${this.options.maxRetries} retries:`, err);
          this.addToDeadLetterQueue({ ...event, retryCount: attempt });
          return;
        }
        await new Promise((r) => setTimeout(r, this.options.retryDelayMs * Math.pow(2, attempt)));
      }
    }
  }

  private addToDeadLetterQueue(event: IntegrationEvent): void {
    this.deadLetterQueue.push(event);
    if (this.deadLetterQueue.length > this.options.deadLetterQueueSize) {
      this.deadLetterQueue.shift();
    }
  }

  getDeadLetterQueue(): IntegrationEvent[] {
    return [...this.deadLetterQueue];
  }

  async replayDeadLetterEvents(): Promise<void> {
    const events = this.getDeadLetterQueue();
    this.deadLetterQueue = [];
    for (const event of events) {
      await this.dispatch(event);
    }
  }
}

// Global singleton event bus
export const globalEventBus = new IntegrationEventBus();
