const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/rbac.middleware');

// RLS Migration endpoint (no HMAC required)
const rlsMigrationController = require('../../controllers/admin/rls-migration.controller');
router.post('/run-rls-migration', rlsMigrationController.runRLSMigration);

const adminController = require('../../controllers/admin/admin.controller');
const migrationController = require('../../controllers/admin/migration.controller');

// All admin routes require admin authentication
router.use(requireRole('admin'));

// Users
router.get('/users', adminController.listUsers);

// KYC Management
router.get('/kyc/:userId', adminController.getKYCStatus);
router.put('/kyc/:sessionId', adminController.updateKYCStatus);

// Payments
router.get('/payment-customers', adminController.listPaymentCustomers);
router.get('/subscriptions', adminController.listSubscriptions);

module.exports = router;

router.post('/migrate-kyc', migrationController.runKycMigration);
