const { authenticate } = require('../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { aiLimiter } = require('../middleware/security');

router.post('/extract', aiLimiter, aiController.extractData);
router.post('/structure', aiLimiter, aiController.structureData);
router.post('/compare', aiLimiter, aiController.compareData);
router.post('/decide', aiLimiter, aiController.makeDecision);

module.exports = router;
