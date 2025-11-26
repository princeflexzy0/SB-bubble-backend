const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('stripe-idempotency');

/**
 * Create customer with idempotency
 */
const createCustomerIdempotent = async (email, userId) => {
  const idempotencyKey = `customer_${userId}`;
  
  try {
    const customer = await stripe.customers.create(
      { email },
      { idempotencyKey }
    );
    
    logger.info('Customer created', { customerId: customer.id });
    return customer;
  } catch (error) {
    logger.error('Customer creation failed', { error: error.message });
    throw error;
  }
};

/**
 * Create setup intent with idempotency
 */
const createSetupIntentIdempotent = async (customerId, userId) => {
  const idempotencyKey = `setup_${userId}_${Date.now()}`;
  
  try {
    const setupIntent = await stripe.setupIntents.create(
      { customer: customerId },
      { idempotencyKey }
    );
    
    logger.info('Setup intent created', { setupIntentId: setupIntent.id });
    return setupIntent;
  } catch (error) {
    logger.error('Setup intent creation failed', { error: error.message });
    throw error;
  }
};

/**
 * Create subscription with idempotency
 */
const createSubscriptionIdempotent = async (customerId, _priceId, userId) => {
  const idempotencyKey = `subscription_${userId}_${_priceId}`;
  
  try {
    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: _priceId }],
        expand: ['latest_invoice.payment_intent']
      },
      { idempotencyKey }
    );
    
    logger.info('Subscription created', { subscriptionId: subscription.id });
    return subscription;
  } catch (error) {
    logger.error('Subscription creation failed', { error: error.message });
    throw error;
  }
};

/**
 * Check for duplicate subscriptions
 */
const checkDuplicateSubscription = async (userId, _priceId) => {
  const { query } = require('../../config/database');
  
  const result = await query(
    `SELECT id FROM subscriptions 
     WHERE user_id = $1 
     AND status IN ('active', 'trialing')
     LIMIT 1`,
    [userId]
  );
  
  if (result.rows.length > 0) {
    throw new Error('User already has an active subscription');
  }
};

module.exports = {
  createCustomerIdempotent,
  createSetupIntentIdempotent,
  createSubscriptionIdempotent,
  checkDuplicateSubscription
};
