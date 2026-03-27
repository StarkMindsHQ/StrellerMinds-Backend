import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IEvent, IEventHandler } from '../interfaces/event.interface';
import { EVENT_HANDLER_METADATA } from '../decorators/event-handler.decorator';

@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private handlers = new Map<string, IEventHandler[]>();

  constructor(private readonly moduleRef: ModuleRef) {}

  register(eventType: string, handler: IEventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async publish(event: IEvent): Promise<void> {
    const eventType = event.type;
    const handlers = this.handlers.get(eventType) || [];

    if (handlers.length === 0) {
      this.logger.warn(`No handlers found for event type: ${eventType}`);
      return;
    }

    const promises = handlers.map(async (handler) => {
      try {
        await handler.handle(event);
      } catch (error) {
        this.logger.error(
          `Error handling event ${eventType}: ${error.message}`,
          error.stack
        );
      }
    });

    await Promise.allSettled(promises);
  }

  async publishBatch(events: IEvent[]): Promise<void> {
    const promises = events.map(event => this.publish(event));
    await Promise.allSettled(promises);
  }

  async registerHandlers() {
    const providers = this.moduleRef.entries.values();
    for (const provider of providers) {
      const metadata = Reflect.getMetadata(EVENT_HANDLER_METADATA, provider.constructor);
      if (metadata) {
        this.register(metadata.name, provider as IEventHandler);
      }
    }
  }
}
