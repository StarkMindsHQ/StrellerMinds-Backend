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
  SquareService,
  SubscriptionService,
  InvoiceService,
  FinancialReportingService,
  TaxCalculationService,
  DisputeService,
  PaymentPlanService,
  PaymentMethodManagementService,
} from './services';
import {
  PaymentController,
  SubscriptionController,
  InvoiceController,
  TaxController,
  FinancialReportController,
  DisputeController,
  WebhookController,
  PaymentMethodController,
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
    SquareService,
    SubscriptionService,
    InvoiceService,
    FinancialReportingService,
    TaxCalculationService,
    DisputeService,
    PaymentPlanService,
    PaymentMethodManagementService,
  ],
  controllers: [
    PaymentController,
    SubscriptionController,
    InvoiceController,
    TaxController,
    FinancialReportController,
    DisputeController,
    WebhookController,
    PaymentMethodController,
  ],
  exports: [
    PaymentService,
    StripeService,
    PayPalService,
    SquareService,
    SubscriptionService,
    InvoiceService,
    FinancialReportingService,
    TaxCalculationService,
    DisputeService,
    PaymentPlanService,
    PaymentMethodManagementService,
  ],
})
export class PaymentModule {}
