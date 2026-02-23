import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityEvent } from './entities/community-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityEvent,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class EventsModule {}
