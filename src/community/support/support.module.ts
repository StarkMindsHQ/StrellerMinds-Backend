import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './entities/support-ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportTicket,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class SupportModule {}
