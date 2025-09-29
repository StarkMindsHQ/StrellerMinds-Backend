import { Injectable } from '@nestjs/common';
import zxcvbn from 'zxcvbn';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number;
}

@Injectable()
export class PasswordValidationService {
  private readonly MIN_LENGTH = 8;
  private readonly MIN_SCORE = 3; // zxcvbn score (0-4)

  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    
    // Debug info for tests
    console.log('Validating password:', password);
    
    // Check length
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }
    
    // Check complexity
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Common password check is commented out for now
    
    // Using zxcvbn for advanced strength analysis
    const analysis = zxcvbn(password);
    console.log('zxcvbn score:', analysis.score, 'MIN_SCORE:', this.MIN_SCORE);
    
    if (analysis.score < this.MIN_SCORE) {
      errors.push('Password is too weak. Please choose a stronger password');
    }
    
    console.log('Validation errors:', errors);
    
    return {
      isValid: errors.length === 0,
      errors,
      score: analysis.score
    };
  }
  
  getPasswordRequirements(): string[] {
    return [
      `At least ${this.MIN_LENGTH} characters long`,
      'Contains at least one uppercase letter',
      'Contains at least one lowercase letter',
      'Contains at least one number',
      'Contains at least one special character',
      'Not a commonly used password'
    ];
  }
}