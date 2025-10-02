const {
  processPayment,
  createSubscription,
  generateInvoice,
  trackPaymentAnalytics,
} = require('./paymentGateway');

// Mock functions for Stripe API responses
jest.mock('stripe', () => () => ({
  paymentIntents: {
    create: jest.fn(() => ({ id: 'pi_123', status: 'succeeded' })),
  },
  subscriptions: {
    create: jest.fn(() => ({ id: 'sub_123', status: 'active' })),
  },
  invoices: {
    create: jest.fn(() => ({ id: 'inv_123', status: 'draft' })),
  },
}));

// Test cases

describe('Payment Gateway Integration', () => {
  it('should process a payment successfully', async () => {
    const payment = await processPayment('pm_123', 'usd', 5000);
    expect(payment.id).toBe('pi_123');
    expect(payment.status).toBe('succeeded');
  });

  it('should create a subscription successfully', async () => {
    const subscription = await createSubscription('cus_123', 'price_123');
    expect(subscription.id).toBe('sub_123');
    expect(subscription.status).toBe('active');
  });

  it('should generate an invoice successfully', async () => {
    const invoice = await generateInvoice('cus_123');
    expect(invoice.id).toBe('inv_123');
    expect(invoice.status).toBe('draft');
  });

  it('should track payment analytics successfully', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    trackPaymentAnalytics('payment_succeeded', { amount: 5000 });
    expect(consoleSpy).toHaveBeenCalledWith('Event Type: payment_succeeded', { amount: 5000 });
  });
});
