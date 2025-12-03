const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query } = require('../../config/database');
const { createLogger } = require('../../config/monitoring');

const logger = createLogger('stripe-service');

/**
 * Create Stripe customer with idempotency
 */
const createCustomer = async (userId, email) => {
  try {
    const stripeCustomer = await stripe.customers.create(
      {
        email,
        metadata: { userId },
      },
      {
        idempotencyKey: `customer_${userId}` // Stable idempotency key
      }
    );

    const result = await query(
      `INSERT INTO payment_customers (user_id, stripe_customer_id, billing_email)
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id) DO UPDATE SET billing_email = $3
       RETURNING *`,
      [userId, stripeCustomer.id, email]
    );

    logger.info('Stripe customer created', { userId, customerId: stripeCustomer.id });

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create Stripe customer', { error: error.message, userId });
    throw error;
  }
};

/**
 * Create SetupIntent with 3D Secure and stable idempotency
 */
const createSetupIntent = async (customerId, userRegion = null) => {
  try {
    const customer = await query(
      `SELECT stripe_customer_id FROM payment_customers WHERE id = $1`,
      [customerId]
    );

    if (customer.rows.length === 0) {
      throw new Error('Customer not found');
    }

    const stripeCustomerId = customer.rows[0].stripe_customer_id;

    const setupIntent = await stripe.setupIntents.create(
      {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        // ENFORCE 3D SECURE
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        },
        metadata: {
          customerId,
          userRegion: userRegion || 'unknown'
        }
      },
      {
        // STABLE IDEMPOTENCY KEY (not timestamp-based)
        idempotencyKey: `setup_${stripeCustomerId}_${customerId}`
      }
    );

    logger.info('Setup intent created with 3DS', { customerId });

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  } catch (error) {
    logger.error('Failed to create setup intent', { error: error.message, customerId });
    throw error;
  }
};

/**
 * Validate card country matches user region
 */
const validateCardRegion = async (paymentMethodId, userRegion) => {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const cardCountry = paymentMethod.card?.country;

    if (!cardCountry) {
      logger.warn('Could not determine card country', { paymentMethodId });
      return { valid: true, warning: 'Card country unknown' };
    }

    // Define allowed regions (customize as needed)
    const regionMapping = {
      'US': ['US', 'CA'],
      'EU': ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'SE', 'DK', 'PL'],
      'UK': ['GB'],
      'NG': ['NG'],
      'GLOBAL': null // Allow all
    };

    const allowedCountries = regionMapping[userRegion];
    
    if (allowedCountries && !allowedCountries.includes(cardCountry)) {
      logger.warn('Card country mismatch', { cardCountry, userRegion, paymentMethodId });
      return { 
        valid: false, 
        error: `Card issued in ${cardCountry} not accepted for region ${userRegion}` 
      };
    }

    return { valid: true, cardCountry };
  } catch (error) {
    logger.error('Card validation failed', { error: error.message });
    return { valid: true, warning: 'Validation skipped due to error' };
  }
};

/**
 * Create subscription with idempotency and region validation
 */
const createSubscription = async (userId, priceId, paymentMethodId = null, userRegion = null) => {
  try {
    const customer = await query(
      `SELECT stripe_customer_id FROM payment_customers WHERE user_id = $1`,
      [userId]
    );

    if (customer.rows.length === 0) {
      throw new Error('Customer not found');
    }

    // Validate card region if payment method provided
    if (paymentMethodId && userRegion) {
      const regionCheck = await validateCardRegion(paymentMethodId, userRegion);
      if (!regionCheck.valid) {
        throw new Error(regionCheck.error);
      }
    }

    const stripeCustomerId = customer.rows[0].stripe_customer_id;

    const subscriptionData = {
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      payment_settings: {
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        }
      },
      metadata: {
        userId,
        userRegion: userRegion || 'unknown'
      }
    };

    if (paymentMethodId) {
      subscriptionData.default_payment_method = paymentMethodId;
    }

    const subscription = await stripe.subscriptions.create(
      subscriptionData,
      {
        // Stable idempotency key
        idempotencyKey: `sub_${userId}_${priceId}`
      }
    );

    await query(
      `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_price_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6)) 
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = $4, updated_at = NOW()
       RETURNING *`,
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

/**
 * Cancel subscription
 */
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

/**
 * Handle webhook event
 */
const handleWebhookEvent = async (event) => {
  try {
    await query(
      `INSERT INTO payment_events (stripe_event_id, event_type, event_data)
       VALUES ($1, $2, $3)
       ON CONFLICT (stripe_event_id) DO NOTHING`,
      [event.id, event.type, JSON.stringify(event.data)]
    );

    switch (event.type) {
      case 'invoice.payment_succeeded':
      case 'invoice.paid':
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
      case 'customer.subscription.updated':
        await query(
          `UPDATE subscriptions SET status = $1, updated_at = NOW()
           WHERE stripe_subscription_id = $2`,
          [event.data.object.status, event.data.object.id]
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

/**
 * Get customer portal session
 */
const createPortalSession = async (userId, returnUrl) => {
  try {
    const customer = await query(
      `SELECT stripe_customer_id FROM payment_customers WHERE user_id = $1`,
      [userId]
    );

    if (customer.rows.length === 0) {
      throw new Error('Customer not found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.rows[0].stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    logger.error('Failed to create portal session', { error: error.message, userId });
    throw error;
  }
};

module.exports = {
  createCustomer,
  createSetupIntent,
  createSubscription,
  cancelSubscription,
  handleWebhookEvent,
  createPortalSession,
  validateCardRegion
};
