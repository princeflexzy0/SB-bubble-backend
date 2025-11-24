const express = require('express');
const router = express.Router();
const kycController = require('../../controllers/kyc/kyc.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.post('/start', authenticate, kycController.startKYC);
router.post('/consent', authenticate, kycController.submitConsent);
router.get('/options', authenticate, kycController.getOptions);
router.post('/upload-url', authenticate, kycController.getUploadUrl);
router.post('/confirm-upload', authenticate, kycController.confirmUpload);
router.post('/send-otp', authenticate, kycController.sendOTP);
router.post('/verify-otp', authenticate, kycController.verifyOTP);
router.get('/status/:kycSessionId', authenticate, kycController.getStatus);
router.post('/change-id-type', authenticate, kycController.changeIDType);

module.exports = router;
