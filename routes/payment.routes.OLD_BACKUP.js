const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment/payment.controller');
const { paymentLimiter } = require('../middleware/security');
const { ensureIdempotency } = require('../utils/idempotency');
const { validatePayPalWebhook } = require('../middleware/validatePayPalWebhook');

/**
 * @route   POST /api/v1/pay/stripe/create
 * @desc    Create Stripe payment (with idempotency)
 * @access  Private
 */
router.post('/stripe/create', paymentLimiter, ensureIdempotency(), paymentController.createStripePayment);

/**
 * @route   POST /api/v1/pay/paypal/create
 * @desc    Create PayPal payment (with idempotency)
 * @access  Private
 */
router.post('/paypal/create', paymentLimiter, ensureIdempotency(), paymentController.createPayPalPayment);

/**
 * @route   POST /api/v1/pay/confirm
 * @desc    Confirm payment (with idempotency)
 * @access  Private
 */
router.post('/confirm', paymentLimiter, ensureIdempotency(), paymentController.confirmPayment);

/**
 * @route   POST /api/v1/pay/refund/:transactionId
 * @desc    Refund payment (with idempotency)
 * @access  Private
 */
router.post('/refund/:transactionId', paymentLimiter, ensureIdempotency(), paymentController.refundPayment);

/**
 * @route   GET /api/v1/pay/transaction/:transactionId
 * @desc    Get transaction details
 * @access  Private
 */
router.get('/transaction/:transactionId', paymentController.getTransaction);

/**
 * @route   POST /api/v1/pay/webhook/stripe
 * @desc    Stripe webhook handler (raw body for signature verification)
 * @access  Public (verified by signature)
 */
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

/**
 * @route   POST /api/v1/pay/webhook/paypal
 * @desc    PayPal webhook handler with FULL signature verification
 * @access  Public (verified by signature)
 */
router.post('/webhook/paypal', 
  express.raw({ type: 'application/json' }), 
  validatePayPalWebhook,
  paymentController.paypalWebhook || ((req, res) => {
    // Temporary handler if paypalWebhook not implemented
    console.log('PayPal webhook received (verified):', req.body);
    res.status(200).json({ received: true });
  })
);

module.exports = router;
