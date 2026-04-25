/**
 * Password strength requirements and validation utility
 */

export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  errors: string[];
  score: number;
}

export class PasswordValidator {
  // Minimum requirements
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;

  // Pattern components
  private static readonly LOWERCASE_PATTERN = /[a-z]/;
  private static readonly UPPERCASE_PATTERN = /[A-Z]/;
  private static readonly DIGIT_PATTERN = /\d/;
  private static readonly SPECIAL_PATTERN = /[@$!%*?&]/;
  private static readonly VALID_CHARS_PATTERN = /^[A-Za-z\d@$!%*?&]+$/;

  // Combined validation pattern (for quick validation)
  private static readonly STRENGTH_PATTERN =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

  /**
   * Validate password against all requirements
   */
  static validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length validation
    if (!password) {
      errors.push('Password is required');
      return {
        isValid: false,
        strength: PasswordStrength.WEAK,
        errors,
        score: 0,
      };
    }

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    } else {
      score += 1;
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
    }

    // Character set validation
    if (!this.LOWERCASE_PATTERN.test(password)) {
      errors.push('Password must contain at least one lowercase letter (a-z)');
    } else {
      score += 1;
    }

    if (!this.UPPERCASE_PATTERN.test(password)) {
      errors.push('Password must contain at least one uppercase letter (A-Z)');
    } else {
      score += 1;
    }

    if (!this.DIGIT_PATTERN.test(password)) {
      errors.push('Password must contain at least one number (0-9)');
    } else {
      score += 1;
    }

    if (!this.SPECIAL_PATTERN.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    } else {
      score += 1;
    }

    // Invalid characters check
    if (!this.VALID_CHARS_PATTERN.test(password)) {
      errors.push('Password contains invalid characters. Use only: A-Z, a-z, 0-9, @$!%*?&');
    }

    // Calculate strength
    const strength = this.calculateStrength(password, score);
    const isValid = errors.length === 0;

    return {
      isValid,
      strength,
      errors,
      score,
    };
  }

  /**
   * Quick validation - returns true/false only
   */
  static isValid(password: string): boolean {
    return this.STRENGTH_PATTERN.test(password);
  }

  /**
   * Calculate password strength level
   */
  private static calculateStrength(password: string, score: number): PasswordStrength {
    // Score from character type checks (max 5)
    if (score < 2) return PasswordStrength.WEAK;
    if (score < 3) return PasswordStrength.FAIR;
    if (score < 4) return PasswordStrength.GOOD;
    if (score < 5) return PasswordStrength.STRONG;

    // Very strong: all requirements met + additional length bonus
    if (password.length >= 12) return PasswordStrength.VERY_STRONG;
    return PasswordStrength.STRONG;
  }

  /**
   * Get password strength details for UI feedback
   */
  static getStrengthDetails(password: string): {
    strength: PasswordStrength;
    percentage: number;
    description: string;
  } {
    const { strength, score } = this.validate(password);
    const percentage = (score / 5) * 100;

    const descriptions = {
      [PasswordStrength.WEAK]: 'Very weak - Does not meet requirements',
      [PasswordStrength.FAIR]: 'Weak - Missing multiple requirements',
      [PasswordStrength.GOOD]: 'Good - Meets all basic requirements',
      [PasswordStrength.STRONG]: 'Strong - Excellent security',
      [PasswordStrength.VERY_STRONG]: 'Very Strong - Maximum security',
    };

    return {
      strength,
      percentage: Math.min(percentage, 100),
      description: descriptions[strength],
    };
  }

  /**
   * Check if password meets minimum requirements (quick check)
   * Returns true if password passes all validation rules
   */
  static meetsRequirements(password: string): boolean {
    const result = this.validate(password);
    return result.isValid;
  }
}

// Export regex for DTO decorator usage
export const PASSWORD_STRENGTH_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;
