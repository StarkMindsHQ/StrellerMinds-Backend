import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandBus } from './bus/command-bus.service';
import { QueryBus } from './bus/query-bus.service';
import { EventBus } from './bus/event-bus.service';
import { EventStoreService } from './event-store/event-store.service';
import { EventEntity } from './entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity])],
  providers: [CommandBus, QueryBus, EventBus, EventStoreService],
  exports: [CommandBus, QueryBus, EventBus, EventStoreService],
})
export class CqrsModule implements OnModuleInit {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
  ) {}

  async onModuleInit() {
    await this.commandBus.registerHandlers();
    await this.queryBus.registerHandlers();
    await this.eventBus.registerHandlers();
  }
}
