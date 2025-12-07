const crypto = require('crypto');
const env = require('../config/env');

// Use encryption key from environment
const ENCRYPTION_KEY = env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive PII data
 */
function encryptPII(plaintext) {
  if (!plaintext) return null;
  
  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    // console.error('PII encryption failed:', error.message);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt PII data
 */
function decryptPII(ciphertext) {
  if (!ciphertext) return null;
  
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // console.error('PII decryption failed:', error.message);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Encrypt multiple PII fields in an object
 */
function encryptPIIFields(data, fields) {
  const encrypted = { ...data };
  
  for (const field of fields) {
    if (encrypted[field]) {
      encrypted[field] = encryptPII(encrypted[field]);
    }
  }
  
  return encrypted;
}

/**
 * Decrypt multiple PII fields in an object
 */
function decryptPIIFields(data, fields) {
  const decrypted = { ...data };
  
  for (const field of fields) {
    if (decrypted[field]) {
      decrypted[field] = decryptPII(decrypted[field]);
    }
  }
  
  return decrypted;
}

// Fields that must be encrypted in KYC
const KYC_PII_FIELDS = [
  'fullName',
  'nationality', 
  'documentNumber',
  'dateOfBirth',
  'issueDate'
];

module.exports = {
  encryptPII,
  decryptPII,
  encryptPIIFields,
  decryptPIIFields,
  KYC_PII_FIELDS
};
