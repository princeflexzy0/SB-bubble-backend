const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('stripe-service');

const createCustomer = async (userId, email, metadata = {}) => {
  try {
    const stripeCustomer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    const result = await query(
      `INSERT INTO payment_customers (user_id, stripe_customer_id, billing_email)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, stripeCustomer.id, email]
    );

    logger.info('Stripe customer created', { userId, customerId: stripeCustomer.id });

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create Stripe customer', { error: error.message, userId });
    throw error;
  }
};

const createSetupIntent = async (customerId) => {
  try {
    const customer = await query(
      `SELECT stripe_customer_id FROM payment_customers WHERE id = $1`,
      [customerId]
    );

    if (customer.rows.length === 0) {
      throw new Error('Customer not found');
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.rows[0].stripe_customer_id,
      payment_method_types: ['card'],
    });

    logger.info('Setup intent created', { customerId });

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  } catch (error) {
    logger.error('Failed to create setup intent', { error: error.message, customerId });
    throw error;
  }
};

const createSubscription = async (userId, priceId, paymentMethodId = null) => {
  try {
    const customer = await query(
      `SELECT stripe_customer_id FROM payment_customers WHERE user_id = $1`,
      [userId]
    );

    if (customer.rows.length === 0) {
      throw new Error('Customer not found');
    }

    const subscriptionData = {
      customer: customer.rows[0].stripe_customer_id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    };

    if (paymentMethodId) {
      subscriptionData.default_payment_method = paymentMethodId;
    }

    const subscription = await stripe.subscriptions.create(subscriptionData);

    await query(
      `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_price_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6)) RETURNING *`,
      [userId, subscription.id, priceId, subscription.status, subscription.current_period_start, subscription.current_period_end]
    );

    logger.info('Subscription created', { userId, subscriptionId: subscription.id });

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
  } catch (error) {
    logger.error('Failed to create subscription', { error: error.message, userId });
    throw error;
  }
};

const cancelSubscription = async (subscriptionId, immediate = false) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !immediate,
    });

    if (immediate) {
      await stripe.subscriptions.cancel(subscriptionId);
    }

    await query(
      `UPDATE subscriptions SET cancel_at_period_end = $1, canceled_at = NOW(), status = $2, updated_at = NOW()
       WHERE stripe_subscription_id = $3`,
      [!immediate, immediate ? 'canceled' : subscription.status, subscriptionId]
    );

    logger.info('Subscription canceled', { subscriptionId, immediate });

    return {
      subscriptionId,
      status: immediate ? 'canceled' : 'active',
      cancelAtPeriodEnd: !immediate,
    };
  } catch (error) {
    logger.error('Failed to cancel subscription', { error: error.message, subscriptionId });
    throw error;
  }
};

const handleWebhookEvent = async (event) => {
  try {
    await query(
      `INSERT INTO payment_events (stripe_event_id, event_type, event_data)
       VALUES ($1, $2, $3)`,
      [event.id, event.type, JSON.stringify(event.data)]
    );

    switch (event.type) {
      case 'invoice.payment_succeeded':
        logger.info('Invoice paid', { invoiceId: event.data.object.id });
        break;
      case 'invoice.payment_failed':
        logger.warn('Invoice payment failed', { invoiceId: event.data.object.id });
        break;
      case 'customer.subscription.deleted':
        await query(
          `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [event.data.object.id]
        );
        break;
    }

    await query(
      `UPDATE payment_events SET processed = TRUE, processed_at = NOW() WHERE stripe_event_id = $1`,
      [event.id]
    );

    logger.info('Webhook event processed', { eventId: event.id, type: event.type });
  } catch (error) {
    logger.error('Failed to handle webhook', { error: error.message, eventId: event.id });
    throw error;
  }
};

module.exports = {
  createCustomer,
  createSetupIntent,
  createSubscription,
  cancelSubscription,
  handleWebhookEvent,
};
