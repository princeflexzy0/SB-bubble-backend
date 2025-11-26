const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payment/payment.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { paymentLimiter } = require('../../middleware/security');
const { ensureIdempotency } = require('../../utils/idempotency');
const { validatePayPalWebhook } = require('../../middleware/validatePayPalWebhook');

// ==========================================
// CUSTOMER & SUBSCRIPTION MANAGEMENT
// ==========================================

router.post('/create-customer', authenticate, paymentController.createCustomer);
router.post('/add-payment-method', authenticate, paymentController.addPaymentMethod);
router.post('/create-subscription', authenticate, paymentController.createSubscription);
router.post('/cancel-subscription/:subscriptionId', authenticate, paymentController.cancelSubscription);
router.get('/subscription/:subscriptionId', authenticate, paymentController.getSubscription);

// ==========================================
// PAYMENT PROCESSING (with idempotency)
// ==========================================

router.post('/stripe/create', authenticate, paymentLimiter, ensureIdempotency(), paymentController.createStripePayment);
router.post('/paypal/create', authenticate, paymentLimiter, ensureIdempotency(), paymentController.createPayPalPayment);

// ==========================================
// REFUNDS
// ==========================================

router.post('/stripe/refund', authenticate, paymentLimiter, paymentController.refundStripePayment);
router.post('/paypal/refund', authenticate, paymentLimiter, paymentController.refundPayPalPayment);

// ==========================================
// WEBHOOKS (no auth required)
// ==========================================

router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);
router.post('/paypal-webhook', validatePayPalWebhook, paymentController.handlePayPalWebhook);

// ==========================================
// BILLING CONSENT
// ==========================================

router.post('/billing-consent', authenticate, paymentController.recordBillingConsent);

module.exports = router;
