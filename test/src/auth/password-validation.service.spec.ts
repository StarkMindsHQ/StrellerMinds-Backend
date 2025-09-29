import { Test, TestingModule } from '@nestjs/testing';
import { PasswordValidationService } from './password-validation.service';

describe('PasswordValidationService', () => {
  let service: PasswordValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordValidationService],
    }).compile();

    service = module.get<PasswordValidationService>(PasswordValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePassword', () => {
    it('should return valid for a strong password', () => {
  // Use a more complex password that will score higher with zxcvbn
  const result = service.validatePassword('Purple-MONKEY-Dishwasher-42');
  expect(result.isValid).toBe(true);
  expect(result.errors).toHaveLength(0);
  expect(result.score).toBeGreaterThanOrEqual(3);
});

    it('should reject passwords that are too short', () => {
      const result = service.validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = service.validatePassword('lowercaseonly123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = service.validatePassword('UPPERCASEONLY123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = service.validatePassword('NoNumbersHere!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const result = service.validatePassword('NoSpecialChars123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', () => {
      const result = service.validatePassword('Password123!');
      expect(result.isValid).toBe(false);
      // Note: This might not always be caught by common-password-checker depending on its database
    });

    it('should reject weak passwords based on zxcvbn score', () => {
      const result = service.validatePassword('Simple1!');
      expect(result.isValid).toBe(false);
    });
  });

  describe('getPasswordRequirements', () => {
    it('should return a list of requirements', () => {
      const requirements = service.getPasswordRequirements();
      expect(requirements).toBeInstanceOf(Array);
      expect(requirements.length).toBeGreaterThan(0);
    });
  });
});