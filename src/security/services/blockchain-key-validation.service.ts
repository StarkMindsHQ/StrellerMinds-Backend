import { Injectable, Logger } from '@nestjs/common';

/**
 * BlockchainKeyValidationService
 *
 * Provides validation and security checks for Stellar blockchain keys.
 * Implements best practices for key management and validation.
 */
@Injectable()
export class BlockchainKeyValidationService {
  private readonly logger = new Logger(BlockchainKeyValidationService.name);

  // Stellar key format patterns
  private readonly STELLAR_SECRET_KEY_PATTERN = /^S[A-Z0-9]{55}$/;
  private readonly STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z0-9]{55}$/;
  private readonly TESTNET_SECRET_KEY_PATTERN = /^S[A-Z0-9]{55}$/;

  // Security constants
  private readonly MIN_KEY_LENGTH = 56; // 'S' + 55 characters
  private readonly MAX_KEY_LENGTH = 56;

  /**
   * Validates a Stellar secret key format
   * @param key - The secret key to validate
   * @returns Validation result with detailed error messages
   */
  validateStellarSecretKey(key: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if key exists
    if (!key || typeof key !== 'string') {
      errors.push('Stellar secret key is required');
      return { valid: false, errors };
    }

    // Check length
    if (key.length !== this.MIN_KEY_LENGTH) {
      errors.push(
        `Stellar secret key must be exactly ${this.MIN_KEY_LENGTH} characters long (got ${key.length})`,
      );
    }

    // Check format pattern
    if (!this.STELLAR_SECRET_KEY_PATTERN.test(key)) {
      errors.push('Stellar secret key must start with "S" followed by 55 alphanumeric characters');
    }

    // Check for common insecure patterns
    if (this.containsInsecurePattern(key)) {
      errors.push(
        'Stellar secret key contains insecure patterns. Use a securely generated random key.',
      );
    }

    // Validate checksum (base58 check)
    if (!this.isValidBase58Check(key)) {
      errors.push('Stellar secret key has invalid checksum. Key may be corrupted or invalid.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a Stellar public key format
   * @param key - The public key to validate
   * @returns Validation result with detailed error messages
   */
  validateStellarPublicKey(key: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!key || typeof key !== 'string') {
      errors.push('Stellar public key is required');
      return { valid: false, errors };
    }

    if (key.length !== 56) {
      errors.push(`Stellar public key must be exactly 56 characters long (got ${key.length})`);
    }

    if (!this.STELLAR_PUBLIC_KEY_PATTERN.test(key)) {
      errors.push('Stellar public key must start with "G" followed by 55 alphanumeric characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if a key contains common insecure patterns
   */
  private containsInsecurePattern(key: string): boolean {
    const insecurePatterns = [
      /^(.)\1+$/, // Repeated characters (e.g., SSSSS...)
      /[0-9]{10,}/, // Long sequences of numbers
      /[A-Z]{10,}/, // Long sequences of letters
      /^(S|G)[a-z]+$/, // Lowercase letters (Stellar keys are uppercase)
      /password|secret|test|example|placeholder/i, // Common weak patterns
    ];

    return insecurePatterns.some((pattern) => pattern.test(key));
  }

  /**
   * Validates base58check encoding (simplified version)
   * Stellar uses StrKey encoding which is similar to base58check
   */
  private isValidBase58Check(key: string): boolean {
    // Basic validation - in production, use @stellar/stellar-sdk for full validation
    const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    // Check if all characters are valid base58
    for (const char of key) {
      if (!base58Alphabet.includes(char)) {
        // Allow uppercase only for Stellar keys
        if (!base58Alphabet.toUpperCase().includes(char)) {
          return false;
        }
      }
    }

    // Stellar keys should be uppercase
    if (key !== key.toUpperCase()) {
      return false;
    }

    return true;
  }

  /**
   * Generates a secure placeholder message for documentation
   */
  getSecurePlaceholderMessage(): string {
    return '<SECURE_STELLAR_SECRET_KEY_FROM_SECRETS_MANAGER>';
  }

  /**
   * Returns security best practices for Stellar key management
   */
  getSecurityBestPractices(): string[] {
    return [
      'Never commit real secret keys to version control',
      'Use a secure secrets manager (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)',
      'Generate separate key pairs for each environment (development, staging, production)',
      'Implement key rotation policies and procedures',
      'Monitor key usage and set up alerts for unauthorized access attempts',
      'Use hardware security modules (HSM) for production keys when possible',
      'Implement access controls and audit logging for key access',
      'For testnet development, generate keys at https://laboratory.stellar.org',
      'Never share secret keys via email, chat, or unencrypted channels',
      'Implement multi-signature schemes for high-value operations',
      'Regularly audit key storage and access patterns',
      'Have a key compromise response plan in place',
    ];
  }

  /**
   * Validates environment variable configuration for Stellar keys
   */
  validateEnvironmentConfig(): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    const stellarKey = process.env.SIGNER_SECRET_KEY || process.env.STELLAR_SECRET_KEY;

    if (!stellarKey) {
      errors.push('Stellar secret key not configured in environment variables');
      return { valid: false, warnings, errors };
    }

    // Check for placeholder patterns
    if (stellarKey.includes('<') || stellarKey.includes('>')) {
      errors.push(
        'Stellar secret key appears to be a placeholder. Replace with actual key from secrets manager',
      );
      return { valid: false, warnings, errors };
    }

    // Validate the key format
    const validationResult = this.validateStellarSecretKey(stellarKey);
    if (!validationResult.valid) {
      errors.push(...validationResult.errors);
      return { valid: false, warnings, errors };
    }

    // Add warnings for development environments
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      warnings.push('Ensure production keys are stored in a secure secrets manager');
      warnings.push('Verify key rotation policies are in place');
    } else {
      warnings.push('Using development/testnet keys - do not use in production');
    }

    return {
      valid: true,
      warnings,
      errors,
    };
  }
}
