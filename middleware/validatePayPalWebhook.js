const crypto = require('crypto');
const axios = require('axios');

/**
 * PayPal Webhook Signature Verification
 * Implements official PayPal webhook verification
 * https://developer.paypal.com/api/rest/webhooks/
 */
async function validatePayPalWebhook(req, res, next) {
  try {
    // Extract PayPal headers
    const transmissionId = req.headers['paypal-transmission-id'];
    const transmissionTime = req.headers['paypal-transmission-time'];
    const transmissionSig = req.headers['paypal-transmission-sig'];
    const certUrl = req.headers['paypal-cert-url'];
    const authAlgo = req.headers['paypal-auth-algo'];
    
    // Check all required headers present
    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      // console.error('Missing PayPal webhook headers');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid PayPal webhook - missing headers'
      });
    }

    // Get webhook ID from environment
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      // console.error('PAYPAL_WEBHOOK_ID not configured');
      return res.status(500).json({
        status: 'error',
        message: 'Webhook configuration error'
      });
    }

    // Construct expected message for signature verification
    const expectedMessage = `${transmissionId}|${transmissionTime}|${webhookId}|${crypto.createHash('sha256').update(req.rawBody || JSON.stringify(req.body)).digest('base64')}`;

    // Download PayPal certificate
    let cert;
    try {
      // Only allow PayPal cert URLs
      if (!certUrl.startsWith('https://api.paypal.com/') && !certUrl.startsWith('https://api.sandbox.paypal.com/')) {
        throw new Error('Invalid certificate URL');
      }
      
      const certResponse = await axios.get(certUrl, { timeout: 5000 });
      cert = certResponse.data;
    } catch (error) {
      // console.error('Failed to download PayPal certificate:', error.message);
      return res.status(400).json({
        status: 'error',
        message: 'Failed to verify webhook certificate'
      });
    }

    // Verify signature
    const verify = crypto.createVerify(authAlgo);
    verify.update(expectedMessage);
    
    const isValid = verify.verify(cert, transmissionSig, 'base64');

    if (!isValid) {
      // console.error('PayPal webhook signature verification failed');
      return res.status(403).json({
        status: 'error',
        message: 'Invalid webhook signature'
      });
    }

    // Signature valid - proceed
    // console.log('✅ PayPal webhook signature verified');
    next();
  } catch (error) {
    // console.error('PayPal webhook verification error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Webhook verification error'
    });
  }
}

module.exports = {
  validatePayPalWebhook
};
