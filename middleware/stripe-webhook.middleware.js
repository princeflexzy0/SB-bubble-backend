const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createLogger } = require('../config/monitoring');

const logger = createLogger('stripe-webhook');

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Verify Stripe webhook signature
 */
const verifyStripeWebhook = (req, res, next) => {
  try {
    if (!WEBHOOK_SECRET) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['stripe-signature'];

    if (!signature) {
      logger.warn('Missing Stripe signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature using Stripe SDK
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      WEBHOOK_SECRET
    );

    // Attach verified event to request
    req.stripeEvent = event;
    
    logger.info('Stripe webhook verified', { type: event.type, id: event.id });
    
    next();
  } catch (error) {
    logger.error('Stripe webhook verification failed', { error: error.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }
};

/**
 * Check for duplicate webhook events
 */
const checkDuplicateEvent = async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    const eventId = req.stripeEvent.id;

    // Check if event already processed
    const result = await query(
      `SELECT id FROM payment_events WHERE event_id = $1`,
      [eventId]
    );

    if (result.rows.length > 0) {
      logger.warn('Duplicate webhook event ignored', { eventId });
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Store event to prevent duplicates
    await query(
      `INSERT INTO payment_events (event_id, event_type, processed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, req.stripeEvent.type]
    );

    next();
  } catch (error) {
    logger.error('Duplicate check failed', { error: error.message });
    next(); // Continue anyway
  }
};

module.exports = {
  verifyStripeWebhook,
  checkDuplicateEvent
};
