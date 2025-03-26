import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payment.controller';
import { PaymentsService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { Subscription } from './entities/subscription.entity';
import { StellarService } from './services/stellar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Subscription]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, StellarService],
  exports: [PaymentsService],
})
export class PaymentModule {}
