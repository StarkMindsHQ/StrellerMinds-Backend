import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Payment,
  Subscription,
  PaymentPlan,
  Invoice,
  Refund,
  Dispute,
  TaxRate,
  FinancialReport,
  PaymentMethodEntity,
} from './entities';
import {
  PaymentService,
  StripeService,
  PayPalService,
  SubscriptionService,
  InvoiceService,
  FinancialReportingService,
  TaxCalculationService,
  DisputeService,
  PaymentPlanService,
} from './services';
import {
  PaymentController,
  SubscriptionController,
  InvoiceController,
  TaxController,
  FinancialReportController,
  DisputeController,
  WebhookController,
} from './controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Subscription,
      PaymentPlan,
      Invoice,
      Refund,
      Dispute,
      TaxRate,
      FinancialReport,
      PaymentMethodEntity,
    ]),
  ],
  providers: [
    PaymentService,
    StripeService,
    PayPalService,
    SubscriptionService,
    InvoiceService,
    FinancialReportingService,
    TaxCalculationService,
    DisputeService,
    PaymentPlanService,
  ],
  controllers: [
    PaymentController,
    SubscriptionController,
    InvoiceController,
    TaxController,
    FinancialReportController,
    DisputeController,
    WebhookController,
  ],
  exports: [
    PaymentService,
    StripeService,
    PayPalService,
    SubscriptionService,
    InvoiceService,
    FinancialReportingService,
    TaxCalculationService,
    DisputeService,
    PaymentPlanService,
  ],
})
export class PaymentModule {}
