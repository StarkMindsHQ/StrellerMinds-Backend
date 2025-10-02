const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Process payment using Stripe
 * @param {string} paymentMethodId - The payment method ID
 * @param {string} currency - The currency code (e.g., 'usd')
 * @param {number} amount - The amount in cents
 * @returns {Promise} - Stripe payment intent
 */
async function processPayment(paymentMethodId, currency, amount) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethodId,
      confirmation_method: 'automatic',
      confirm: true,
    });
    return paymentIntent;
  } catch (error) {
    throw new Error(`Payment processing failed: ${error.message}`);
  }
}

/**
 * Create a subscription
 * @param {string} customerId - The customer ID in Stripe
 * @param {string} priceId - The price ID for the subscription
 * @returns {Promise} - Stripe subscription object
 */
async function createSubscription(customerId, priceId) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
    });
    return subscription;
  } catch (error) {
    throw new Error(`Subscription creation failed: ${error.message}`);
  }
}

/**
 * Generate invoice
 * @param {string} customerId - The customer ID in Stripe
 * @returns {Promise} - Stripe invoice object
 */
async function generateInvoice(customerId) {
  try {
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true, // Auto-finalize this draft after ~1 hour
    });
    return invoice;
  } catch (error) {
    throw new Error(`Invoice generation failed: ${error.message}`);
  }
}

/**
 * Track payment analytics
 * @param {string} eventType - Type of the event (e.g., 'payment_succeeded')
 * @param {object} eventData - Data associated with the event
 */
function trackPaymentAnalytics(eventType, eventData) {
  console.log(`Event Type: ${eventType}`, eventData); // Replace with actual analytics logic
}

module.exports = {
  processPayment,
  createSubscription,
  generateInvoice,
  trackPaymentAnalytics,
};
