import { Injectable } from '@nestjs/common';
import {
  PasswordValidator,
  PasswordValidationResult,
  PasswordStrength,
} from '../validators';

@Injectable()
export class PasswordStrengthService {
  /**
   * Validate password and return detailed results
   */
  validatePassword(password: string): PasswordValidationResult {
    return PasswordValidator.validate(password);
  }

  /**
   * Check if password meets all requirements
   */
  isPasswordStrong(password: string): boolean {
    return PasswordValidator.meetsRequirements(password);
  }

  /**
   * Get password strength for UI feedback
   */
  getPasswordStrengthDetails(password: string) {
    return PasswordValidator.getStrengthDetails(password);
  }

  /**
   * Get human-readable password policy
   */
  getPasswordPolicy() {
    return {
      minimumLength: 8,
      maximumLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialCharacters: true,
      allowedSpecialCharacters: '@$!%*?&',
      description:
        'Password must be 8-128 characters with uppercase, lowercase, numbers, and special characters (@$!%*?&)',
      examples: [
        {
          password: 'SecurePass123!',
          valid: true,
          strength: 'Strong',
        },
        {
          password: 'MyP@ssw0rd',
          valid: true,
          strength: 'Strong',
        },
        {
          password: 'weak',
          valid: false,
          reason: 'Too short and missing requirements',
        },
        {
          password: 'NoSpecialChars123',
          valid: false,
          reason: 'Missing special character',
        },
      ],
    };
  }

  /**
   * Check if two passwords match
   */
  passwordsMatch(password1: string, password2: string): boolean {
    return password1 === password2;
  }

  /**
   * Validate password history (prevent reuse of old passwords)
   * This would be used with a database of hashed previous passwords
   */
  async isPasswordDifferentFromHistory(
    newPassword: string,
    _passwordHistory: string[], // hashed previous passwords
  ): Promise<boolean> {
    // TODO: Implement with bcrypt.compare
    // For now, just return true as we don't store history yet
    return true;
  }
}
