import * as crypto from 'crypto';

import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16

let _key: Buffer | null = null;
let keyInitialized = false;

function getKey(): Buffer {
  if (keyInitialized && !_key) {
    // If initialization was attempted and failed (e.g. key was invalid/missing)
    throw new Error('ENCRYPTION_KEY is invalid or missing. Cannot perform decryption.');
  }
  if (_key) {
    return _key;
  }

  const encryptionKeyString = process.env.ENCRYPTION_KEY;
  keyInitialized = true; // Mark that we've attempted to initialize the key

  if (!encryptionKeyString || encryptionKeyString.length !== 64) {
    logger.error(
      'ENCRYPTION_KEY environment variable is not defined or not a 64-character hex string (32 bytes). Decryption will fail for all tokens.',
    );
    // _key remains null, subsequent calls to getKey will throw immediately
    throw new Error('ENCRYPTION_KEY is invalid or missing.');
  }

  _key = Buffer.from(encryptionKeyString, 'hex');
  logger.info('Encryption helper initialized with ENCRYPTION_KEY from environment variable.');
  return _key;
}

export function encryptText(text: string | null | undefined): string | null {
  if (text === null || typeof text === 'undefined') {
    return null;
  }
  try {
    const key = getKey(); // This can throw if ENCRYPTION_KEY is not set/invalid
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error: any) {
    logger.error(`Encryption failed for input text: ${error.message}`, error.stack);
    return null;
  }
}

export function decryptText(encryptedText: string | null | undefined): string | null {
  if (encryptedText === null || typeof encryptedText === 'undefined') {
    return null;
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    logger.warn(`Attempted to decrypt malformed text (invalid parts). Input: ${encryptedText.substring(0, 20)}...`);
    return null;
  }

  try {
    const key = getKey(); // This might throw if ENCRYPTION_KEY is not set up correctly
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: any) {
    // This will catch errors from getKey() or crypto operations
    logger.error(`Decryption failed: ${error.message}. Input: ${encryptedText.substring(0, 20)}...`);
    return null;
  }
}

const HEX_REGEX = /^[0-9a-fA-F]+$/;

export function isEncrypted(text: string | null | undefined): boolean {
  if (typeof text !== 'string') {
    return false;
  }

  const parts = text.split(':');
  if (parts.length !== 3) {
    return false;
  }

  const [iv, authTag, encryptedData] = parts;

  // Check IV: 16 bytes = 32 hex characters
  if (iv.length !== 32 || !HEX_REGEX.test(iv)) {
    return false;
  }

  // Check AuthTag: 16 bytes = 32 hex characters for aes-256-gcm
  if (authTag.length !== 32 || !HEX_REGEX.test(authTag)) {
    return false;
  }

  // Check EncryptedData: must be hex and have an even length
  if (encryptedData.length === 0 || encryptedData.length % 2 !== 0 || !HEX_REGEX.test(encryptedData)) {
    return false;
  }

  return true;
}
