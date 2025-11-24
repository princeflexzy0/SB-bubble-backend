const stripeService = require('../../services/payment/stripe.service');
const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const logger = createLogger('payment-controller');

const createCustomer = async (req, res) => {
  try {
    const { billingEmail } = req.body;
    const email = billingEmail || req.user.email;

    const existing = await query(
      'SELECT * FROM payment_customers WHERE user_id = $1',
      [req.userId]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, data: existing.rows[0] });
    }

    const customer = await stripeService.createCustomer(req.userId, email);

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    logger.error('Failed to create customer', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
};

const addPaymentMethod = async (req, res) => {
  try {
    const customer = await query(
      'SELECT id FROM payment_customers WHERE user_id = $1',
      [req.userId]
    );

    if (customer.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const result = await stripeService.createSetupIntent(customer.rows[0].id);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to add payment method', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add payment method' });
  }
};

const createSubscription = async (req, res) => {
  try {
    const { priceId, paymentMethodId } = req.body;

    const result = await stripeService.createSubscription(req.userId, priceId, paymentMethodId);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to create subscription', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create subscription' });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { immediate } = req.body;

    const subscription = await query(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1 AND user_id = $2',
      [subscriptionId, req.userId]
    );

    if (subscription.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const result = await stripeService.cancelSubscription(subscriptionId, immediate);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to cancel subscription', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
};

const getSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const result = await query(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1 AND user_id = $2',
      [subscriptionId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Failed to get subscription', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get subscription' });
  }
};

const handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    await stripeService.handleWebhookEvent(event);

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error', { error: error.message });
    res.status(400).json({ success: false, error: 'Webhook error' });
  }
};

module.exports = {
  createCustomer,
  addPaymentMethod,
  createSubscription,
  cancelSubscription,
  getSubscription,
  handleWebhook,
};

// Legacy payment methods (not implemented yet, return 501)
module.exports.createStripePayment = async (req, res) => {
  res.status(501).json({ success: false, message: 'Use /create-customer and /create-subscription instead' });
};

module.exports.createPayPalPayment = async (req, res) => {
  res.status(501).json({ success: false, message: 'PayPal not implemented yet' });
};

module.exports.confirmPayment = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

module.exports.refundPayment = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

module.exports.getTransaction = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

module.exports.stripeWebhook = async (req, res) => {
  res.status(501).json({ success: false, message: 'Webhook not implemented yet' });
};

module.exports.paypalWebhook = async (req, res) => {
  res.status(501).json({ success: false, message: 'PayPal not implemented yet' });
};
