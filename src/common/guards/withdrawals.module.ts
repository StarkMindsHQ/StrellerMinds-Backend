import { Module } from '@nestjs/common';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';

@Module({
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
})
export class WithdrawalsModule {}