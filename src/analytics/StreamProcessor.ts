import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { interval, Subject, Observable, merge } from 'rxjs';
import { takeUntil, filter, map, bufferTime, mergeMap } from 'rxjs/operators';
import * as Redis from 'ioredis';

export interface AnalyticsEvent {
  id: string;
  type: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  service: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface StreamProcessorConfig {
  bufferSize: number;
  bufferTime: number; // in milliseconds
  batchSize: number;
  processingInterval: number; // in milliseconds
  retryAttempts: number;
  retryDelay: number; // in milliseconds
}

export interface ProcessingResult {
  processed: number;
  failed: number;
  errors: Array<{
    event: AnalyticsEvent;
    error: string;
  }>;
  duration: number;
}

@Injectable()
export class StreamProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamProcessor.name);
  private eventStreams: Map<string, Subject<AnalyticsEvent>> = new Map();
  private processors: Map<string, Observable<ProcessingResult>> = new Map();
  private destroy$ = new Subject<void>();
  private redis: Redis.Redis;
  private config: StreamProcessorConfig;

  constructor(
    private eventEmitter: EventEmitter2,
  ) {
    this.config = {
      bufferSize: 1000,
      bufferTime: 5000,
      batchSize: 100,
      processingInterval: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
    };

    this.redis = new Redis.Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit() {
    this.logger.log('Initializing Stream Processor...');
    await this.setupEventStreams();
    this.startHealthMonitoring();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Stream Processor...');
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async publishEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Add to Redis stream for persistence and cross-instance processing
      await this.redis.xadd('analytics:events', '*', 
        'id', event.id,
        'type', event.type,
        'timestamp', event.timestamp.toISOString(),
        'userId', event.userId || '',
        'sessionId', event.sessionId || '',
        'service', event.service,
        'data', JSON.stringify(event.data),
        'metadata', JSON.stringify(event.metadata || {})
      );

      // Emit to local stream for immediate processing
      const stream = this.getOrCreateStream(event.service);
      stream.next(event);

      // Emit global event for other processors
      this.eventEmitter.emit('analytics.event.published', event);

      this.logger.debug(`Published event: ${event.type} for service: ${event.service}`);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.type}`, error);
      throw error;
    }
  }

  async subscribeToEvents(
    eventType?: string,
    service?: string,
    callback?: (event: AnalyticsEvent) => void,
  ): Promise<Observable<AnalyticsEvent>> {
    let observable: Observable<AnalyticsEvent>;

    if (service && this.eventStreams.has(service)) {
      observable = this.eventStreams.get(service)!.asObservable();
    } else {
      // Create combined observable from all streams
      const streams = Array.from(this.eventStreams.values()).map(stream => stream.asObservable());
      observable = merge(...streams);
    }

    if (eventType) {
      observable = observable.pipe(
        filter(event => event.type === eventType)
      );
    }

    if (callback) {
      observable.subscribe(callback);
    }

    return observable;
  }

  async getEvents(
    service?: string,
    eventType?: string,
    startTime?: Date,
    endTime?: Date,
    limit = 100,
  ): Promise<AnalyticsEvent[]> {
    try {
      const streamKey = service ? `analytics:events:${service}` : 'analytics:events';
      
      let args: string[] = [streamKey];
      
      if (startTime || endTime) {
        args.push('-');
        args.push('+');
        
        if (startTime) {
          args.push('MINID');
          args.push(this.timestampToRedisId(startTime));
        }
        
        if (endTime) {
          args.push('MAXID');
          args.push(this.timestampToRedisId(endTime));
        }
      } else {
        args.push('-', '+');
      }

      args.push('COUNT', limit.toString());

      const result = await this.redis.xread(...args);
      const events: AnalyticsEvent[] = [];

      if (result) {
        for (const [, messages] of result) {
          for (const message of messages) {
            const event = this.parseRedisMessage(message);
            
            if (eventType && event.type !== eventType) continue;
            if (startTime && event.timestamp < startTime) continue;
            if (endTime && event.timestamp > endTime) continue;
            
            events.push(event);
          }
        }
      }

      return events;
    } catch (error) {
      this.logger.error('Failed to get events from Redis', error);
      return [];
    }
  }

  async createEventStream(
    service: string,
    processors: Array<(events: AnalyticsEvent[]) => Promise<ProcessingResult>>,
    config?: Partial<StreamProcessorConfig>,
  ): Promise<void> {
    const streamConfig = { ...this.config, ...config };
    const eventStream = this.getOrCreateStream(service);

    const processor = eventStream.pipe(
      takeUntil(this.destroy$),
      bufferTime(streamConfig.bufferTime, null, streamConfig.bufferSize),
      filter(events => events.length > 0),
      mergeMap(async (events) => {
        const results: ProcessingResult[] = [];
        
        // Process events in batches
        for (let i = 0; i < events.length; i += streamConfig.batchSize) {
          const batch = events.slice(i, i + streamConfig.batchSize);
          
          for (const processorFn of processors) {
            try {
              const result = await this.executeProcessor(processorFn, batch, streamConfig);
              results.push(result);
            } catch (error) {
              this.logger.error(`Processor failed for batch of ${batch.length} events`, error);
              results.push({
                processed: 0,
                failed: batch.length,
                errors: batch.map(event => ({
                  event,
                  error: error.message,
                })),
                duration: 0,
              });
            }
          }
        }

        return results;
      }),
    );

    this.processors.set(service, processor);
    processor.subscribe({
      next: (results) => this.handleProcessingResults(service, results),
      error: (error) => this.logger.error(`Processing error for ${service}`, error),
      complete: () => this.logger.log(`Processing completed for ${service}`),
    });

    this.logger.log(`Created event stream for service: ${service}`);
  }

  async removeEventStream(service: string): Promise<void> {
    if (this.eventStreams.has(service)) {
      this.eventStreams.get(service)!.complete();
      this.eventStreams.delete(service);
    }

    if (this.processors.has(service)) {
      this.processors.delete(service);
    }

    this.logger.log(`Removed event stream for service: ${service}`);
  }

  async getStreamStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {
      totalStreams: this.eventStreams.size,
      services: {},
      redis: await this.getRedisStats(),
    };

    for (const [service, stream] of this.eventStreams) {
      stats.services[service] = {
        active: !stream.closed,
        observers: stream.observers.length,
      };
    }

    return stats;
  }

  async replayEvents(
    service: string,
    startTime: Date,
    endTime: Date,
    callback?: (event: AnalyticsEvent) => void,
  ): Promise<number> {
    const events = await this.getEvents(service, undefined, startTime, endTime);
    let replayedCount = 0;

    for (const event of events) {
      try {
        await this.publishEvent(event);
        replayedCount++;
        
        if (callback) {
          callback(event);
        }
      } catch (error) {
        this.logger.error(`Failed to replay event: ${event.id}`, error);
      }
    }

    this.logger.log(`Replayed ${replayedCount} events for service: ${service}`);
    return replayedCount;
  }

  async createConsumerGroup(groupName: string, consumerName: string): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', 'analytics:events', groupName, '$', 'MKSTREAM');
      this.logger.log(`Created consumer group: ${groupName}`);
    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        this.logger.log(`Consumer group ${groupName} already exists`);
      } else {
        throw error;
      }
    }

    // Start consumer
    this.startConsumer(groupName, consumerName);
  }

  private async startConsumer(groupName: string, consumerName: string): Promise<void> {
    const consumeInterval = interval(1000).pipe(
      takeUntil(this.destroy$),
      mergeMap(async () => {
        try {
          const result = await this.redis.xreadgroup(
            'GROUP', groupName, consumerName,
            'COUNT', '10',
            'BLOCK', '1000',
            'STREAMS', 'analytics:events', '>'
          );

          if (result) {
            for (const [, messages] of result) {
              for (const message of messages) {
                const event = this.parseRedisMessage(message);
                
                // Process the event
                await this.processEvent(event);
                
                // Acknowledge the message
                await this.redis.xack('analytics:events', groupName, message[0]);
              }
            }
          }
        } catch (error) {
          this.logger.error(`Consumer ${consumerName} error`, error);
        }
      })
    );

    consumeInterval.subscribe();
  }

  private async processEvent(event: AnalyticsEvent): Promise<void> {
    // Emit event for other services to process
    this.eventEmitter.emit('analytics.event.processed', event);
  }

  private getOrCreateStream(service: string): Subject<AnalyticsEvent> {
    if (!this.eventStreams.has(service)) {
      this.eventStreams.set(service, new Subject<AnalyticsEvent>());
    }
    return this.eventStreams.get(service)!;
  }

  private async executeProcessor(
    processor: (events: AnalyticsEvent[]) => Promise<ProcessingResult>,
    events: AnalyticsEvent[],
    config: StreamProcessorConfig,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < config.retryAttempts) {
      try {
        const result = await processor(events);
        result.duration = Date.now() - startTime;
        return result;
      } catch (error) {
        lastError = error;
        attempts++;
        
        if (attempts < config.retryAttempts) {
          await this.delay(config.retryDelay * attempts);
        }
      }
    }

    throw lastError;
  }

  private handleProcessingResults(service: string, results: ProcessingResult[]): void {
    let totalProcessed = 0;
    let totalFailed = 0;
    const allErrors: Array<{ event: AnalyticsEvent; error: string }> = [];

    for (const result of results) {
      totalProcessed += result.processed;
      totalFailed += result.failed;
      allErrors.push(...result.errors);
    }

    if (totalProcessed > 0) {
      this.logger.log(`Processed ${totalProcessed} events for ${service}`);
    }

    if (totalFailed > 0) {
      this.logger.warn(`Failed to process ${totalFailed} events for ${service}`);
      
      // Emit error event for failed events
      for (const { event, error } of allErrors) {
        this.eventEmitter.emit('analytics.event.failed', { event, error });
      }
    }

    // Emit processing summary
    this.eventEmitter.emit('analytics.processing.completed', {
      service,
      processed: totalProcessed,
      failed: totalFailed,
      duration: results.reduce((sum, r) => sum + r.duration, 0),
    });
  }

  private async setupEventStreams(): Promise<void> {
    // Set up default streams for common services
    const defaultServices = ['user', 'course', 'payment', 'notification', 'analytics'];
    
    for (const service of defaultServices) {
      this.getOrCreateStream(service);
    }

    this.logger.log(`Set up ${defaultServices.length} default event streams`);
  }

  private startHealthMonitoring(): void {
    const healthCheck = interval(30000).pipe(
      takeUntil(this.destroy$),
      map(async () => {
        try {
          await this.redis.ping();
          this.eventEmitter.emit('analytics.health.check', { status: 'healthy' });
        } catch (error) {
          this.eventEmitter.emit('analytics.health.check', { 
            status: 'unhealthy', 
            error: error.message 
          });
        }
      })
    );

    healthCheck.subscribe();
  }

  private async getRedisStats(): Promise<Record<string, any>> {
    try {
      const info = await this.redis.info('memory');
      const memoryInfo = this.parseRedisInfo(info);
      
      return {
        connected: this.redis.status === 'ready',
        memory: {
          used: memoryInfo.used_memory_human,
          peak: memoryInfo.used_memory_peak_human,
        },
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n');
    const result: Record<string, any> = {};
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  private parseRedisMessage(message: any): AnalyticsEvent {
    const data: Record<string, any> = {};
    
    for (let i = 1; i < message.length; i += 2) {
      const key = message[i];
      const value = message[i + 1];
      
      if (key === 'data' || key === 'metadata') {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      } else if (key === 'timestamp') {
        data[key] = new Date(value);
      } else {
        data[key] = value;
      }
    }

    return data as AnalyticsEvent;
  }

  private timestampToRedisId(timestamp: Date): string {
    return (timestamp.getTime() - Date.now() * 1000).toString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility methods for event validation and transformation
  validateEvent(event: AnalyticsEvent): boolean {
    return !!(event.id && event.type && event.timestamp && event.service);
  }

  enrichEvent(event: AnalyticsEvent, enrichment: Record<string, any>): AnalyticsEvent {
    return {
      ...event,
      metadata: {
        ...event.metadata,
        ...enrichment,
      },
    };
  }

  filterEvent(event: AnalyticsEvent, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'type' && event.type !== value) return false;
      if (key === 'service' && event.service !== value) return false;
      if (key === 'userId' && event.userId !== value) return false;
      if (key.startsWith('data.') && event.data[key.slice(5)] !== value) return false;
    }
    return true;
  }

  transformEvent(event: AnalyticsEvent, transformer: (event: AnalyticsEvent) => AnalyticsEvent): AnalyticsEvent {
    return transformer(event);
  }
}
