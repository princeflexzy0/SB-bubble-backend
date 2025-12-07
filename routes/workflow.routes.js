const { authenticate } = require('../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');

/**
 * @route   POST /api/v1/flow/create
 * @desc    Create workflow run
 * @access  Private
 */
router.post(authenticate, ('/create', workflowController.createWorkflow);

/**
 * @route   GET /api/v1/flow
 * @desc    List user workflows
 * @access  Private
 */
router.get(authenticate, ('/', workflowController.listWorkflows);

/**
 * @route   GET /api/v1/flow/:workflowId
 * @desc    Get workflow details
 * @access  Private
 */
router.get(authenticate, ('/:workflowId', workflowController.getWorkflow);

/**
 * @route   POST /api/v1/flow/:workflowId/cancel
 * @desc    Cancel workflow
 * @access  Private
 */
router.post(authenticate, ('/:workflowId/cancel', workflowController.cancelWorkflow);

/**
 * @route   POST /api/v1/flow/:workflowId/retry
 * @desc    Retry failed workflow
 * @access  Private
 */
router.post(authenticate, ('/:workflowId/retry', workflowController.retryWorkflow);

module.exports = router;
