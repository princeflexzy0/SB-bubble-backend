const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createLogger } = require('../../config/monitoring');
const { query } = require('../../config/database');

const logger = createLogger('stripe-service');

/**
 * Create or get existing Stripe customer
 */
async function getOrCreateCustomer(userId, email) {
  try {
    // Check if customer exists in DB
    const result = await query(
      'SELECT stripe_customer_id FROM payment_customers WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length > 0 && result.rows[0].stripe_customer_id) {
      return result.rows[0].stripe_customer_id;
    }

    // Create new customer with idempotency
    const customer = await stripe.customers.create({
      email,
      metadata: { user_id: userId }
    }, {
      idempotencyKey: `customer_${userId}`
    });

    // Store in DB
    await query(
      `INSERT INTO payment_customers (user_id, stripe_customer_id, email, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = $2`,
      [userId, customer.id, email]
    );

    logger.info('Stripe customer created', { userId, customerId: customer.id });
    return customer.id;
  } catch (error) {
    logger.error('Failed to create Stripe customer', { userId, error: error.message });
    throw error;
  }
}

/**
 * Create SetupIntent with 3DS
 */
async function createSetupIntent(userId, stripeCustomerId) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic' // Force 3DS
        }
      }
    }, {
      idempotencyKey: `setup_${stripeCustomerId}` // No timestamp for reuse
    });

    logger.info('SetupIntent created', { userId, setupIntentId: setupIntent.id });
    return setupIntent;
  } catch (error) {
    logger.error('Failed to create SetupIntent', { userId, error: error.message });
    throw error;
  }
}

/**
 * Create subscription with duplicate prevention
 */
async function createSubscription(userId, stripeCustomerId, priceId) {
  try {
    // Check for existing active subscription
    const existing = await query(
      `SELECT id FROM subscriptions 
       WHERE user_id = $1 AND status IN ('active', 'trialing')`,
      [userId]
    );

    if (existing.rows.length > 0) {
      throw new Error('User already has an active subscription');
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent']
    }, {
      idempotencyKey: `sub_${userId}_${priceId}`
    });

    // Store in DB
    await query(
      `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, 
        status, current_period_start, current_period_end, created_at)
       VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6), NOW())`,
      [
        userId,
        subscription.id,
        stripeCustomerId,
        subscription.status,
        subscription.current_period_start,
        subscription.current_period_end
      ]
    );

    logger.info('Subscription created', { userId, subscriptionId: subscription.id });
    return subscription;
  } catch (error) {
    logger.error('Failed to create subscription', { userId, error: error.message });
    throw error;
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    await query(
      'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
      ['canceled', subscriptionId]
    );

    logger.info('Subscription canceled', { subscriptionId });
    return subscription;
  } catch (error) {
    logger.error('Failed to cancel subscription', { subscriptionId, error: error.message });
    throw error;
  }
}

module.exports = {
  getOrCreateCustomer,
  createSetupIntent,
  createSubscription,
  cancelSubscription
};
