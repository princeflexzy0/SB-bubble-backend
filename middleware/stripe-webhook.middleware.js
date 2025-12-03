const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createLogger } = require('../config/monitoring');

const logger = createLogger('stripe-webhook');

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe's official IP ranges (update periodically from https://stripe.com/docs/ips)
const STRIPE_IP_RANGES = [
  '3.18.12.63',
  '3.130.192.231',
  '13.235.14.237',
  '13.235.122.149',
  '18.211.135.69',
  '35.154.171.200',
  '52.15.183.38',
  '54.88.130.119',
  '54.88.130.237',
  '54.187.174.169',
  '54.187.205.235',
  '54.187.216.72'
];

// Allowed webhook event types (whitelist)
const ALLOWED_EVENTS = [
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'checkout.session.completed',
  'customer.created',
  'customer.updated'
];

// Maximum age for webhook events (5 minutes)
const MAX_EVENT_AGE_SECONDS = 300;

// Maximum request body size (64KB)
const MAX_BODY_SIZE = 65536;

/**
 * Validate Stripe webhook IP address
 */
const validateStripeIP = (req, res, next) => {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.connection?.remoteAddress ||
                   req.ip;

  // In development, skip IP check
  if (process.env.NODE_ENV === 'development') {
    logger.warn('Skipping Stripe IP validation in development', { clientIP });
    return next();
  }

  // Check if IP is in Stripe's range
  const isStripeIP = STRIPE_IP_RANGES.some(range => clientIP.includes(range));
  
  if (!isStripeIP) {
    logger.warn('Webhook request from non-Stripe IP', { clientIP });
    return res.status(403).json({ error: 'Forbidden: Invalid source IP' });
  }

  next();
};

/**
 * Validate request body size
 */
const validateBodySize = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  
  if (contentLength > MAX_BODY_SIZE) {
    logger.warn('Webhook body too large', { contentLength, max: MAX_BODY_SIZE });
    return res.status(413).json({ error: 'Request body too large' });
  }

  next();
};

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
      req.rawBody || req.body,
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
 * Validate event type is allowed
 */
const validateEventType = (req, res, next) => {
  const eventType = req.stripeEvent?.type;

  if (!ALLOWED_EVENTS.includes(eventType)) {
    logger.warn('Unhandled webhook event type', { eventType });
    // Return 200 to acknowledge receipt but don't process
    return res.status(200).json({ received: true, processed: false, reason: 'Event type not handled' });
  }

  next();
};

/**
 * Validate event age (replay attack prevention)
 */
const validateEventAge = (req, res, next) => {
  const event = req.stripeEvent;
  const eventTimestamp = event.created;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const eventAge = currentTimestamp - eventTimestamp;

  if (eventAge > MAX_EVENT_AGE_SECONDS) {
    logger.warn('Webhook event too old (possible replay)', { 
      eventId: event.id, 
      eventAge,
      maxAge: MAX_EVENT_AGE_SECONDS 
    });
    return res.status(400).json({ error: 'Event too old' });
  }

  next();
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
  validateStripeIP,
  validateBodySize,
  verifyStripeWebhook,
  validateEventType,
  validateEventAge,
  checkDuplicateEvent,
  ALLOWED_EVENTS
};
