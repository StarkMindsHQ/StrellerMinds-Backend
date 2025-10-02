import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { InvoiceService } from './invoice.service';
import { PaymentAnalyticsService } from './payment-analytics.service';
import { PaymentEntity } from './entities/payment.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { PaymentMethodEntity } from './entities/payment-method.entity';
import { StripeService } from './stripe.service';
import { PaymentWebhookController } from './payment-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity,
      SubscriptionEntity,
      InvoiceEntity,
      PaymentMethodEntity,
    ]),
    ConfigModule,
  ],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [
    PaymentService,
    SubscriptionService,
    InvoiceService,
    PaymentAnalyticsService,
    StripeService,
  ],
  exports: [
    PaymentService,
    SubscriptionService,
    InvoiceService,
    PaymentAnalyticsService,
    StripeService,
  ],
})
export class PaymentModule {}
