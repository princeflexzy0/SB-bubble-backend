const express = require('express');
const router = express.Router();
const kycController = require('../../controllers/kyc/kyc.controller');
const { authenticate, authenticateAdmin } = require('../../middleware/auth.middleware');
const { validateApiKey } = require('../../middleware/security');
const { validateHmacSignature } = require('../../middleware/hmac.middleware');

// All KYC routes need authentication
router.use(validateHmacSignature);
router.use(validateApiKey);
router.use(authenticate);

// User KYC routes
router.post('/start', kycController.startKYC);
router.post('/:sessionId/upload', kycController.uploadDocument);
router.get('/:sessionId/status', kycController.getStatus);

// Admin-only routes
router.post('/:sessionId/approve', authenticateAdmin, kycController.approveKYC);
router.post('/:sessionId/reject', authenticateAdmin, kycController.rejectKYC);
router.get('/admin/pending', authenticateAdmin, kycController.getPendingSessions);

module.exports = router;
