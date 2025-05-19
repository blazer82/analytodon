import * as crypto from 'crypto';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const validKey = crypto.randomBytes(32).toString('hex'); // 64-char hex
  const invalidKeyShort = 'shortkey';
  const invalidKeyLong = crypto.randomBytes(64).toString('hex'); // 128-char hex

  const setupModule = async (encryptionKey?: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'ENCRYPTION_KEY') {
                return encryptionKey;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();
    // module.useLogger(false); // Disable actual logging for tests if preferred

    configService = module.get<ConfigService>(ConfigService);
    service = module.get<EncryptionService>(EncryptionService);
    service.onModuleInit(); // Manually call onModuleInit for testing
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup spies for logger methods before each test
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log');
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
  });

  describe('Initialization (onModuleInit)', () => {
    it('should initialize with a valid ENCRYPTION_KEY', async () => {
      await setupModule(validKey);
      expect(configService.get).toHaveBeenCalledWith('ENCRYPTION_KEY');
      expect(loggerLogSpy).toHaveBeenCalledWith('EncryptionService initialized with ENCRYPTION_KEY.');
      expect(loggerErrorSpy).not.toHaveBeenCalled();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
      // Internal key should be set from config
      expect(service['key']).toEqual(Buffer.from(validKey, 'hex'));
    });

    it('should log error and use random key if ENCRYPTION_KEY is undefined', async () => {
      await setupModule(undefined);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'ENCRYPTION_KEY is not defined or not a 64-character hex string (32 bytes). Encryption will not be secure.',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Using a randomly generated, insecure encryption key for this session.',
      );
      expect(service['key']).toBeInstanceOf(Buffer);
      expect(service['key'].length).toBe(32); // Ensure it's a 32-byte key
    });

    it('should log error and use random key if ENCRYPTION_KEY is not a 64-char hex string (too short)', async () => {
      await setupModule(invalidKeyShort);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'ENCRYPTION_KEY is not defined or not a 64-character hex string (32 bytes). Encryption will not be secure.',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'ENCRYPTION_KEY is not a 64-character hex string. Using a randomly generated, insecure encryption key.',
      );
      expect(service['key']).toBeInstanceOf(Buffer);
      expect(service['key'].length).toBe(32);
    });

    it('should log error and use random key if ENCRYPTION_KEY is not a 64-char hex string (too long)', async () => {
      await setupModule(invalidKeyLong);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'ENCRYPTION_KEY is not defined or not a 64-character hex string (32 bytes). Encryption will not be secure.',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'ENCRYPTION_KEY is not a 64-character hex string. Using a randomly generated, insecure encryption key.',
      );
      expect(service['key']).toBeInstanceOf(Buffer);
      expect(service['key'].length).toBe(32);
    });
  });

  describe('encrypt and decrypt', () => {
    beforeEach(async () => {
      // Ensure service is initialized with a valid key for these tests
      await setupModule(validKey);
    });

    it('should encrypt a string and decrypt it back to the original value', () => {
      const originalText = 'This is a secret message!';
      const encryptedText = service.encrypt(originalText);
      expect(encryptedText).toBeDefined();
      expect(encryptedText).not.toBeNull();
      expect(typeof encryptedText).toBe('string');
      expect(encryptedText).not.toEqual(originalText);

      const decryptedText = service.decrypt(encryptedText as string);
      expect(decryptedText).toEqual(originalText);
    });

    it('encrypting the same string multiple times should produce different ciphertexts', () => {
      const originalText = 'Another secret';
      const encryptedText1 = service.encrypt(originalText);
      const encryptedText2 = service.encrypt(originalText);
      expect(encryptedText1).not.toEqual(encryptedText2); // Due to random IV
    });

    it('encrypt should return null if input is null', () => {
      expect(service.encrypt(null)).toBeNull();
    });

    it('encrypt should return null if input is undefined', () => {
      expect(service.encrypt(undefined)).toBeNull();
    });

    it('decrypt should return null if input is null', () => {
      expect(service.decrypt(null)).toBeNull();
    });

    it('decrypt should return null if input is undefined', () => {
      expect(service.decrypt(undefined)).toBeNull();
    });

    it('decrypt should throw error for invalid encrypted text format (too few parts)', () => {
      const malformedText = 'iv:encrypted';
      expect(() => service.decrypt(malformedText)).toThrow('Invalid encrypted text format.');
    });

    it('decrypt should throw error for invalid encrypted text format (too many parts)', () => {
      const malformedText = 'iv:authTag:encrypted:extra';
      expect(() => service.decrypt(malformedText)).toThrow('Invalid encrypted text format.');
    });

    it('decrypt should throw error if decryption fails (e.g. auth tag mismatch)', () => {
      const originalText = 'Secret data';
      const encryptedText = service.encrypt(originalText) as string;
      const parts = encryptedText.split(':');
      // Tamper with the encrypted data part
      const tamperedEncryptedText = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -4) + 'xxxx'}`;
      expect(() => service.decrypt(tamperedEncryptedText)).toThrow(
        'Decryption process failed. Invalid key or malformed data.',
      );
    });

    it('decrypt should throw error if IV is malformed', () => {
      const originalText = 'Secret data';
      const encryptedText = service.encrypt(originalText) as string;
      const parts = encryptedText.split(':');
      const malformedEncryptedText = `badiv:${parts[1]}:${parts[2]}`;
      expect(() => service.decrypt(malformedEncryptedText)).toThrow(
        'Decryption process failed. Invalid key or malformed data.',
      );
    });

    it('decrypt should throw error if authTag is malformed', () => {
      const originalText = 'Secret data';
      const encryptedText = service.encrypt(originalText) as string;
      const parts = encryptedText.split(':');
      const malformedEncryptedText = `${parts[0]}:badtag:${parts[2]}`;
      expect(() => service.decrypt(malformedEncryptedText)).toThrow(
        'Decryption process failed. Invalid key or malformed data.',
      );
    });

    it('encrypt should throw error and log if crypto operation fails', () => {
      const cryptoError = new Error('Crypto failed');
      const originalCreateCipheriv = crypto.createCipheriv;
      jest.spyOn(crypto, 'createCipheriv').mockImplementationOnce(() => {
        throw cryptoError;
      });

      expect(() => service.encrypt('test')).toThrow('Encryption process failed.');
      expect(loggerErrorSpy).toHaveBeenCalledWith(`Encryption failed: ${cryptoError.message}`, cryptoError.stack);

      jest.spyOn(crypto, 'createCipheriv').mockImplementation(originalCreateCipheriv); // Restore
    });
  });

  describe('Error Handling Propagation', () => {
    // Test with a key that will cause decryption to fail if used on data encrypted with 'validKey'
    const differentValidKey = crypto.randomBytes(32).toString('hex');

    it('decrypt should throw if data is encrypted with a different key', async () => {
      await setupModule(validKey); // Encrypt with service instance 1 (key1)
      const originalText = 'text for key1';
      const encryptedWithKey1 = service.encrypt(originalText);

      await setupModule(differentValidKey); // Decrypt with service instance 2 (key2)
      expect(() => service.decrypt(encryptedWithKey1!)).toThrow(
        'Decryption process failed. Invalid key or malformed data.',
      );
    });
  });
});
