import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullAdapter } from '@bull-board/api/bullAdapter';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'email',
      adapter: BullAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'email-dlq',
      adapter: BullAdapter,
    }),
  ],
})
export class BullBoardConfigModule {}
