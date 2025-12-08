const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payment/payment.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { checkIdempotency } = require('../../middleware/idempotency.middleware');
const { requireValidKYC } = require('../../middleware/kyc.middleware');
const { 
  validateStripeIP,
  validateBodySize,
  verifyStripeWebhook,
  validateEventType,
  validateEventAge,
  checkDuplicateEvent
} = require('../../middleware/stripe-webhook.middleware');

// ⚠️ WEBHOOK MUST BE FIRST (no auth/KYC - verified by Stripe signature + IP)
router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  validateBodySize,
  validateStripeIP,
  verifyStripeWebhook,
  validateEventType,
  validateEventAge,
  checkDuplicateEvent,
  paymentController.handleWebhook
);

// Grace tier (auth required, no KYC)
router.post('/grace-activate', authenticate, paymentController.activateGraceTier);

// All other payment routes require authentication + valid KYC
router.use(authenticate);
router.use(checkIdempotency);
router.use(requireValidKYC);

// Customer & Subscription Management
router.post('/create-customer', paymentController.createCustomer);
router.post('/add-payment-method', paymentController.addPaymentMethod);
router.post('/create-subscription', paymentController.createSubscription);
router.post('/cancel-subscription/:subscriptionId', paymentController.cancelSubscription);
router.get('/subscription/:subscriptionId', paymentController.getSubscription);

module.exports = router;
