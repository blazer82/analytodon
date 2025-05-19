import * as crypto from 'crypto';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private key: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // For AES, this is always 16
  private readonly authTagLength = 16; // For GCM

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const encryptionKeyString = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKeyString || encryptionKeyString.length !== 64) {
      this.logger.error(
        'ENCRYPTION_KEY is not defined or not a 64-character hex string (32 bytes). Encryption will not be secure.',
      );
      // In a production environment, you might want to throw an error here to prevent startup
      // For now, we'll generate a temporary, insecure key for basic functionality if not set.
      // This is NOT recommended for production.
      this.key = crypto.randomBytes(32);
      if (!encryptionKeyString) {
        this.logger.warn('Using a randomly generated, insecure encryption key for this session.');
      } else {
        this.logger.warn(
          'ENCRYPTION_KEY is not a 64-character hex string. Using a randomly generated, insecure encryption key.',
        );
      }
    } else {
      this.key = Buffer.from(encryptionKeyString, 'hex');
      this.logger.log('EncryptionService initialized with ENCRYPTION_KEY.');
    }
  }

  encrypt(text: string | null | undefined): string | null {
    if (text === null || typeof text === 'undefined') {
      return null;
    }
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`, error.stack);
      throw new Error('Encryption process failed.');
    }
  }

  decrypt(encryptedText: string | null | undefined): string | null {
    if (encryptedText === null || typeof encryptedText === 'undefined') {
      return null;
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      this.logger.warn(`Attempted to decrypt malformed text (invalid parts): ${encryptedText}`);
      throw new Error('Invalid encrypted text format.');
    }

    try {
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedData = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error(
        `Decryption failed (crypto operation): ${error.message} for input ${encryptedText}`,
        error.stack,
      );
      throw new Error('Decryption process failed. Invalid key or malformed data.');
    }
  }
}
