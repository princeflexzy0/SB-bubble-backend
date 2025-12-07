const { authenticate } = require('../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { aiLimiter } = require('../middleware/security');

router.post(authenticate, ('/extract', aiLimiter, aiController.extractData);
router.post(authenticate, ('/structure', aiLimiter, aiController.structureData);
router.post(authenticate, ('/compare', aiLimiter, aiController.compareData);
router.post(authenticate, ('/decide', aiLimiter, aiController.makeDecision);

module.exports = router;
