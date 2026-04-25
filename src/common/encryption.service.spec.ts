import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'DB_ENCRYPTION_KEY') return '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
        if (key === 'DB_ENCRYPTION_SALT') return 'test-salt';
        return null;
      }),
    } as any;
    service = new EncryptionService(configService);
  });

  it('should encrypt and decrypt a string', () => {
    const original = 'sensitive data';
    const encrypted = service.encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');
    
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should generate consistent hashes for the same value', () => {
    const value = 'email@example.com';
    const hash1 = service.hash(value);
    const hash2 = service.hash(value);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(value);
  });

  it('should generate different hashes for different values', () => {
    const hash1 = service.hash('email1@example.com');
    const hash2 = service.hash('email2@example.com');
    expect(hash1).not.toBe(hash2);
  });
});
