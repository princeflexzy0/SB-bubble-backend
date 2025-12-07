const env = require('../config/env');
const fs = require('fs').promises;

let clamScanner = null;
let isClamAvailable = false;

/**
 * Initialize ClamAV scanner (optional)
 */
async function initClamAV() {
  // Check if antivirus scanning is enabled
  if (!env.ENABLE_ANTIVIRUS_SCAN || env.ENABLE_ANTIVIRUS_SCAN === 'false') {
    // console.log('ℹ️  Antivirus scanning DISABLED by configuration');
    isClamAvailable = false;
    return null;
  }

  try {
    const NodeClam = require('clamscan');
    
    clamScanner = await new NodeClam().init({
      removeInfected: true,
      quarantineInfected: false,
      scanLog: null,
      debugMode: env.NODE_ENV === 'development',
      clamdscan: {
        host: env.CLAMAV_HOST || 'localhost',
        port: env.CLAMAV_PORT || 3310,
        timeout: 60000,
        localFallback: false
      }
    });

    const version = await clamScanner.getVersion();
    // console.log(`✅ ClamAV initialized: ${version}`);
    isClamAvailable = true;
    
    return clamScanner;
  } catch (error) {
    console.warn('⚠️  ClamAV NOT AVAILABLE:', error.message);
    console.warn('⚠️  File uploads will proceed WITHOUT virus scanning!');
    console.warn('⚠️  To enable: Install ClamAV and set ENABLE_ANTIVIRUS_SCAN=true');
    isClamAvailable = false;
    return null;
  }
}

/**
 * Scan file for viruses
 */
async function scanFile(filePath) {
  // If disabled or not available, skip with clear warning
  if (!env.ENABLE_ANTIVIRUS_SCAN || env.ENABLE_ANTIVIRUS_SCAN === 'false') {
    console.warn(`⚠️  ANTIVIRUS DISABLED: Skipping scan for ${filePath}`);
    return {
      isInfected: false,
      viruses: [],
      skipped: true,
      reason: 'Antivirus scanning disabled by configuration'
    };
  }

  if (!clamScanner && !isClamAvailable) {
    await initClamAV();
  }

  if (!clamScanner) {
    // console.error(`❌ ANTIVIRUS UNAVAILABLE: Cannot scan ${filePath}`);
    return {
      isInfected: false,
      viruses: [],
      skipped: true,
      reason: 'ClamAV not available - see server logs'
    };
  }

  try {
    const { isInfected, viruses } = await clamScanner.isInfected(filePath);

    if (isInfected) {
      // console.error(`🦠 VIRUS DETECTED in ${filePath}:`, viruses);
      
      try {
        await fs.unlink(filePath);
        // console.log(`✅ Infected file deleted: ${filePath}`);
      } catch (err) {
        // console.error(`Failed to delete infected file: ${err.message}`);
      }
    }

    return {
      isInfected,
      viruses: viruses || [],
      skipped: false
    };
  } catch (error) {
    // console.error('Virus scan error:', error);
    return {
      isInfected: false,
      viruses: [],
      error: error.message,
      skipped: false
    };
  }
}

/**
 * Middleware to scan uploaded files
 */
const scanUploadedFile = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const scanResult = await scanFile(req.file.path);

    if (scanResult.isInfected) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'File upload rejected: Virus detected',
        viruses: scanResult.viruses
      });
    }

    if (scanResult.skipped) {
      console.warn(`⚠️  File uploaded WITHOUT antivirus scan: ${req.file.filename}`);
      console.warn(`⚠️  Reason: ${scanResult.reason}`);
      // Continue anyway but log the warning
    }

    if (scanResult.error && !scanResult.skipped) {
      // console.error('Scan error - rejecting upload as precaution');
      return res.status(500).json({
        status: 'error',
        code: 500,
        message: 'File could not be scanned for viruses. Upload rejected as precaution.'
      });
    }

    next();
  } catch (error) {
    // console.error('Antivirus middleware error:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'File upload security check failed'
    });
  }
};

module.exports = {
  initClamAV,
  scanFile,
  scanUploadedFile,
  isClamAvailable: () => isClamAvailable
};
