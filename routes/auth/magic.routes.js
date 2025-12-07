// Public routes - no auth required for magic links
const express = require('express');
const router = express.Router();
const magicController = require('../../controllers/auth/magic.controller');

router.post('/send', magicController.sendMagicLink);
router.post('/verify', magicController.verifyMagicLink);

module.exports = router;
