import { Global, Module } from '@nestjs/common';
import { CqrsBusService } from './services/cqrs-bus.service';
import { EventsModule } from '../events/events.module';

@Global()
@Module({
  imports: [EventsModule],
  providers: [CqrsBusService],
  exports: [CqrsBusService],
})
export class CqrsModule {}
