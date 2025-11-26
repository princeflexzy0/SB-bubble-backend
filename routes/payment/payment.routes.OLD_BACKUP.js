const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payment/payment.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.post('/create-customer', authenticate, paymentController.createCustomer);
router.post('/add-payment-method', authenticate, paymentController.addPaymentMethod);
router.post('/create-subscription', authenticate, paymentController.createSubscription);
router.post('/cancel-subscription/:subscriptionId', authenticate, paymentController.cancelSubscription);
router.get('/subscription/:subscriptionId', authenticate, paymentController.getSubscription);
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;

// Billing Consent
router.post('/billing-consent', authenticate, paymentController.recordBillingConsent);
