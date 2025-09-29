import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';

// Entities
import { EventStoreRecordEntity } from './entities/event-store-record.entity';
import { AggregateSnapshotEntity } from './entities/aggregate-snapshot.entity';

// Services
import { EventBusService } from './services/event-bus.service';
import { EventStoreService } from './services/event-store.service';
import { EventReplayService } from './services/event-replay.service';
import { EventAnalyticsService } from './services/event-analytics.service';

// Processors
import { EventProcessor } from './processors/event.processor';

// Controllers
import { EventReplayController } from './controllers/event-replay.controller';
import { EventAnalyticsController } from './controllers/event-analytics.controller';

// Event Handlers
import { EmailSendRequestedHandler } from './handlers/email/email-send-requested.handler';
import { UserRegisteredHandler } from './handlers/user/user-registered.handler';

// Interfaces
import { IEventBus } from './interfaces/event-bus.interface';
import { IEventStore } from './interfaces/event-store.interface';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EventStoreRecordEntity, AggregateSnapshotEntity]),
    BullModule.registerQueue({
      name: 'events',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  controllers: [EventReplayController, EventAnalyticsController],
  providers: [
    EventBusService,
    EventStoreService,
    EventReplayService,
    EventAnalyticsService,
    EventProcessor,
    EmailSendRequestedHandler,
    UserRegisteredHandler,
    {
      provide: 'EVENT_BUS',
      useExisting: EventBusService,
    },
    {
      provide: 'EVENT_STORE',
      useExisting: EventStoreService,
    },
    {
      provide: IEventBus,
      useExisting: EventBusService,
    },
    {
      provide: IEventStore,
      useExisting: EventStoreService,
    },
  ],
  exports: [
    EventBusService,
    EventStoreService,
    EventReplayService,
    EventAnalyticsService,
    'EVENT_BUS',
    'EVENT_STORE',
    IEventBus,
    IEventStore,
  ],
})
export class EventsModule {}
