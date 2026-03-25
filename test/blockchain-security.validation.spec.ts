/**
 * Blockchain Security Validation Test Suite
 * 
 * Comprehensive tests for Stellar secret key exposure prevention
 * and blockchain security best practices implementation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainKeyValidationService } from '../src/security/services/blockchain-key-validation.service';
import { validationSchema } from '../src/config/validation.schema';

describe('Blockchain Security - Stellar Secret Key Protection', () => {
  let validationService: BlockchainKeyValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockchainKeyValidationService],
    }).compile();

    validationService = module.get<BlockchainKeyValidationService>(BlockchainKeyValidationService);
  });

  describe('Security Criteria 1: Remove actual secret key pattern from example', () => {
    it('should not contain real secret key patterns in .env.example', () => {
      const fs = require('fs');
      const path = require('path');
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      // Check that no real key pattern exists (S followed by 55 alphanumeric chars)
      const realKeyPattern = /S[A-Z0-9]{55}/g;
      const matches = envContent.match(realKeyPattern);

      expect(matches).toBeNull();
    });

    it('should use placeholder format for SIGNER_SECRET_KEY', () => {
      const fs = require('fs');
      const path = require('path');
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      expect(envContent).toContain('<STEWARD_SECRET_KEY_PLACEHOLDER_REPLACE_IN_PRODUCTION>');
      expect(envContent).not.toMatch(/SIGNER_SECRET_KEY=S[A-Z0-9]{55}/);
    });

    it('should use placeholder format for CREDENTIAL_CONTRACT_ID', () => {
      const fs = require('fs');
      const path = require('path');
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      expect(envContent).toContain('<your_contract_id_here>');
      expect(envContent).not.toMatch(/CREDENTIAL_CONTRACT_ID=CC[A-Z0-9]+/);
    });
  });

  describe('Security Criteria 2: Replace with secure placeholder', () => {
    it('should have proper placeholder warnings in .env.example', () => {
      const fs = require('fs');
      const path = require('path');
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      expect(envContent).toContain('SECURITY: Never commit real credentials');
      expect(envContent).toContain('secrets manager');
      expect(envContent).toContain('AWS Secrets Manager');
      expect(envContent).toContain('HashiCorp Vault');
    });

    it('placeholder should follow secure format standards', () => {
      const placeholder = '<STEWARD_SECRET_KEY_PLACEHOLDER_REPLACE_IN_PRODUCTION>';
      
      const result = validationService.validateStellarSecretKey(placeholder);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('placeholder'))).toBe(true);
    });
  });

  describe('Security Criteria 3: Add blockchain security best practices', () => {
    it('should include comprehensive security best practices in .env.example', () => {
      const fs = require('fs');
      const path = require('path');
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      const bestPractices = [
        'NEVER commit real secret keys to version control',
        'Use a secrets manager',
        'Generate separate key pairs for each environment',
        'Implement key rotation policies',
        'Monitor key usage',
        'hardware security modules',
        'multi-signature schemes',
        'laboratory.stellar.org',
      ];

      bestPractices.forEach((practice) => {
        expect(envContent.toLowerCase()).toContain(practice.toLowerCase());
      });
    });

    it('should provide key format information', () => {
      const fs = require('fs');
      const path = require('path');
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      expect(envContent).toContain('56 characters');
      expect(envContent).toContain('S + 55');
    });

    it('validation service should provide best practices programmatically', () => {
      const bestPractices = validationService.getSecurityBestPractices();
      
      expect(bestPractices.length).toBeGreaterThan(5);
      expect(bestPractices).toContain(
        'Never commit real secret keys to version control'
      );
      expect(bestPractices).toContain(
        'Use a secure secrets manager (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)'
      );
    });
  });

  describe('Security Criteria 4: Implement key validation service', () => {
    it('should validate correct Stellar secret key format', () => {
      // Valid testnet key format (this is a known test key)
      const validKey = 'SAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaAAAB';
      const result = validationService.validateStellarSecretKey(validKey);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject keys with incorrect length', () => {
      const shortKey = 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const result = validationService.validateStellarSecretKey(shortKey);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('length'))).toBe(true);
    });

    it('should reject keys not starting with S', () => {
      const invalidKey = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const result = validationService.validateStellarSecretKey(invalidKey);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('start with "S"'))).toBe(true);
    });

    it('should reject keys with lowercase letters', () => {
      const invalidKey = 'Saaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab';
      const result = validationService.validateStellarSecretKey(invalidKey);
      
      expect(result.valid).toBe(false);
    });

    it('should reject placeholder keys', () => {
      const placeholder = '<STEWARD_SECRET_KEY_PLACEHOLDER_REPLACE_IN_PRODUCTION>';
      const result = validationService.validateStellarSecretKey(placeholder);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('placeholder') || e.includes('length'))).toBe(true);
    });

    it('should detect insecure patterns', () => {
      const weakKey = 'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS';
      const result = validationService.validateStellarSecretKey(weakKey);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('insecure pattern'))).toBe(true);
    });

    it('should validate public key format', () => {
      const validPublicKey = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB';
      const result = validationService.validateStellarPublicKey(validPublicKey);
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid public keys not starting with G', () => {
      const invalidPublicKey = 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB';
      const result = validationService.validateStellarPublicKey(invalidPublicKey);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('start with "G"'))).toBe(true);
    });
  });

  describe('Environment Configuration Validation', () => {
    it('should validate using Joi schema with custom Stellar validator', () => {
      const validEnvConfig = {
        STELLAR_SECRET_KEY: 'SAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaAAAB',
      };

      const result = validationSchema.validate(validEnvConfig, { abortEarly: false });
      expect(result.error).toBeUndefined();
    });

    it('should reject placeholder values in Joi schema', () => {
      const invalidEnvConfig = {
        STELLAR_SECRET_KEY: '<STEWARD_SECRET_KEY_PLACEHOLDER_REPLACE_IN_PRODUCTION>',
      };

      const result = validationSchema.validate(invalidEnvConfig, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('placeholder');
    });

    it('should reject malformed keys in Joi schema', () => {
      const invalidEnvConfig = {
        STELLAR_SECRET_KEY: 'invalid_key_format',
      };

      const result = validationSchema.validate(invalidEnvConfig, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('56 characters');
    });

    it('should reject keys with insecure patterns in Joi schema', () => {
      const invalidEnvConfig = {
        STELLAR_SECRET_KEY: 'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
      };

      const result = validationSchema.validate(invalidEnvConfig, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('insecure pattern');
    });
  });

  describe('README Security Updates', () => {
    it('should not contain exposed default secret keys in README.md', () => {
      const fs = require('fs');
      const path = require('path');
      const readmePath = path.join(process.cwd(), 'README.md');
      const readmeContent = fs.readFileSync(readmePath, 'utf8');

      // Check that no real key pattern exists
      const realKeyPattern = /jgjxvsjxvwjxsjxgskjxksmxjswkxwgxwdcj/g;
      expect(readmeContent).not.toMatch(realKeyPattern);

      // Should use secure placeholder
      expect(readmeContent).toContain('secrets_manager');
      expect(readmeContent).toContain('secure key management');
    });
  });

  describe('Integration Tests', () => {
    it('should provide complete security validation report', () => {
      // Mock environment check with missing key
      const originalEnv = process.env.SIGNER_SECRET_KEY;
      delete process.env.SIGNER_SECRET_KEY;

      const report = validationService.validateEnvironmentConfig();
      
      expect(report.valid).toBe(false);
      expect(report.errors.some(e => e.includes('not configured'))).toBe(true);

      // Restore
      if (originalEnv) {
        process.env.SIGNER_SECRET_KEY = originalEnv;
      }
    });

    it('should detect placeholder in environment variables', () => {
      const originalEnv = process.env.SIGNER_SECRET_KEY;
      process.env.SIGNER_SECRET_KEY = '<PLACEHOLDER>';

      const report = validationService.validateEnvironmentConfig();
      
      expect(report.valid).toBe(false);
      expect(report.errors.some(e => e.includes('placeholder'))).toBe(true);

      // Restore
      if (originalEnv) {
        process.env.SIGNER_SECRET_KEY = originalEnv;
      } else {
        delete process.env.SIGNER_SECRET_KEY;
      }
    });
  });

  describe('Security Best Practices Documentation', () => {
    it('should list all critical security notices', () => {
      const fs = require('fs');
      const path = require('path');
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      expect(envContent).toContain('CRITICAL SECURITY NOTICE');
      expect(envContent).toContain('⚠️');
      expect(envContent.split('⚠️').length).toBeGreaterThan(4);
    });

    it('should reference secure key management services', () => {
      const fs = require('fs');
      const path = require('path');
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');

      const secureServices = [
        'AWS Secrets Manager',
        'HashiCorp Vault',
      ];

      secureServices.forEach((service) => {
        expect(envContent).toContain(service);
      });
    });
  });
});
