import { SecureLoggerService } from '../../src/common/secure-logging/secure-logger.service';

/**
 * Secure Logger Service Tests
 * 
 * These tests verify that the SecureLoggerService properly sanitizes
 * sensitive data before logging to prevent data leaks.
 */
describe('SecureLoggerService', () => {
  let secureLogger: SecureLoggerService;

  beforeEach(() => {
    secureLogger = new SecureLoggerService();
  });

  describe('Password Sanitization', () => {
    it('should redact password fields in objects', () => {
      const data = {
        email: 'user@example.com',
        password: 'SuperSecret123!',
        firstName: 'John',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.email).toBe('user@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.firstName).toBe('John');
    });

    it('should redact currentPassword and newPassword fields', () => {
      const data = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.currentPassword).toBe('[REDACTED]');
      expect(sanitized.newPassword).toBe('[REDACTED]');
      expect(sanitized.confirmPassword).toBe('[REDACTED]');
    });

    it('should handle partial password masking for context', () => {
      const config = (secureLogger as any).config;
      config.replacementValue = '[REDACTED]';
      
      const data = { password: 'short' };
      const sanitized = (secureLogger as any).sanitize(data);
      
      // Short passwords are fully redacted
      expect(sanitized.password).toBe('[REDACTED]');
    });
  });

  describe('Token Sanitization', () => {
    it('should redact accessToken and refreshToken fields', () => {
      const data = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIn0',
        userId: '123',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
      expect(sanitized.userId).toBe('123');
    });

    it('should redact authorization header', () => {
      const data = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.signature',
        'content-type': 'application/json',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized['content-type']).toBe('application/json');
    });

    it('should redact token field in any context', () => {
      const data = {
        resetToken: 'abc123def456',
        apiToken: 'xyz789',
        authToken: 'token123',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.resetToken).toBe('[REDACTED]');
      expect(sanitized.apiToken).toBe('[REDACTED]');
      expect(sanitized.authToken).toBe('[REDACTED]');
    });
  });

  describe('PII (Personally Identifiable Information) Sanitization', () => {
    it('should redact credit card information', () => {
      const data = {
        creditCard: '4111111111111111',
        cardNumber: '5500000000000004',
        cvv: '123',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.creditCard).toBe('[REDACTED]');
      expect(sanitized.cardNumber).toBe('[REDACTED]');
      expect(sanitized.cvv).toBe('[REDACTED]');
    });

    it('should redact social security numbers', () => {
      const data = {
        ssn: '123-45-6789',
        socialSecurity: '987-65-4321',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.ssn).toBe('[REDACTED]');
      expect(sanitized.socialSecurity).toBe('[REDACTED]');
    });

    it('should redact phone numbers and addresses', () => {
      const data = {
        phoneNumber: '+1-555-123-4567',
        phone: '555-987-6543',
        address: '123 Main St, Anytown, USA',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.phoneNumber).toBe('[REDACTED]');
      expect(sanitized.phone).toBe('[REDACTED]');
      expect(sanitized.address).toBe('[REDACTED]');
    });

    it('should redact date of birth', () => {
      const data = {
        dateOfBirth: '1990-01-01',
        dob: '1985-12-25',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.dateOfBirth).toBe('[REDACTED]');
      expect(sanitized.dob).toBe('[REDACTED]');
    });
  });

  describe('JWT Token Detection', () => {
    it('should detect and redact JWT tokens in strings', () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123';
      const sanitized = (secureLogger as any).sanitize(jwtToken);

      expect(sanitized).toBe('[JWT_TOKEN_REDACTED]');
    });

    it('should detect and redact Bearer tokens', () => {
      const bearerToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123';
      const sanitized = (secureLogger as any).sanitize(bearerToken);

      expect(sanitized).toBe('[BEARER_TOKEN_REDACTED]');
    });
  });

  describe('Nested Object Sanitization', () => {
    it('should sanitize nested objects', () => {
      const data = {
        user: {
          email: 'user@example.com',
          password: 'Secret123!',
          profile: {
            name: 'John',
            ssn: '123-45-6789',
          },
        },
        metadata: {
          token: 'abc123',
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.user.email).toBe('user@example.com');
      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.user.profile.name).toBe('John');
      expect(sanitized.user.profile.ssn).toBe('[REDACTED]');
      expect(sanitized.metadata.token).toBe('[REDACTED]');
      expect(sanitized.metadata.timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('should sanitize arrays of objects', () => {
      const data = [
        { email: 'user1@example.com', password: 'pass1' },
        { email: 'user2@example.com', password: 'pass2' },
      ];

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized[0].email).toBe('user1@example.com');
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[1].email).toBe('user2@example.com');
      expect(sanitized[1].password).toBe('[REDACTED]');
    });
  });

  describe('Case Insensitivity', () => {
    it('should sanitize fields regardless of case', () => {
      const data = {
        PASSWORD: 'Secret123!',
        Password: 'Secret456!',
        password: 'Secret789!',
        PaSsWoRd: 'Secret000!',
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.PASSWORD).toBe('[REDACTED]');
      expect(sanitized.Password).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.PaSsWoRd).toBe('[REDACTED]');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        password: null,
      };

      const sanitized = (secureLogger as any).sanitize(data);

      expect(sanitized.nullValue).toBe(null);
      expect(sanitized.undefinedValue).toBe(undefined);
      expect(sanitized.password).toBe(null);
    });

    it('should handle primitive types', () => {
      expect((secureLogger as any).sanitize('plain string')).toBe('plain string');
      expect((secureLogger as any).sanitize(123)).toBe(123);
      expect((secureLogger as any).sanitize(true)).toBe(true);
      expect((secureLogger as any).sanitize(false)).toBe(false);
    });

    it('should handle empty objects and arrays', () => {
      expect((secureLogger as any).sanitize({})).toEqual({});
      expect((secureLogger as any).sanitize([])).toEqual([]);
    });

    it('should handle deeply nested objects up to max depth', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: {
                    password: 'deep-secret',
                  },
                },
              },
            },
          },
        },
      };

      const sanitized = (secureLogger as any).sanitize(deepObject);

      // Should sanitize up to max depth (default: 5)
      expect(sanitized.level1.level2.level3.level4.level5).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should respect custom sensitive fields', () => {
      const customLogger = new SecureLoggerService({
        sensitiveFields: ['customSecret', 'myToken'],
        replacementValue: '[CUSTOM_REDACTED]',
        enabled: true,
        maxDepth: 5,
      });

      const data = {
        customSecret: 'secret123',
        myToken: 'token456',
        password: 'pass789',
      };

      const sanitized = (customLogger as any).sanitize(data);

      expect(sanitized.customSecret).toBe('[CUSTOM_REDACTED]');
      expect(sanitized.myToken).toBe('[CUSTOM_REDACTED]');
      // password is not in custom list, so it should not be redacted
      expect(sanitized.password).toBe('pass789');
    });

    it('should be disableable', () => {
      const disabledLogger = new SecureLoggerService({
        enabled: false,
      });

      const data = {
        password: 'Secret123!',
        token: 'abc123',
      };

      const sanitized = (disabledLogger as any).sanitize(data);

      // When disabled, sensitive data should NOT be redacted
      expect(sanitized.password).toBe('Secret123!');
      expect(sanitized.token).toBe('abc123');
    });

    it('should allow getting configuration', () => {
      const config = secureLogger.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.sensitiveFields).toBeDefined();
      expect(config.replacementValue).toBe('[REDACTED]');
      expect(config.maxDepth).toBe(5);
    });
  });

  describe('isSensitiveField', () => {
    it('should correctly identify sensitive fields', () => {
      expect(secureLogger.isSensitiveField('password')).toBe(true);
      expect(secureLogger.isSensitiveField('PASSWORD')).toBe(true);
      expect(secureLogger.isSensitiveField('accessToken')).toBe(true);
      expect(secureLogger.isSensitiveField('ssn')).toBe(true);
      expect(secureLogger.isSensitiveField('email')).toBe(false);
      expect(secureLogger.isSensitiveField('firstName')).toBe(false);
      expect(secureLogger.isSensitiveField('timestamp')).toBe(false);
    });
  });
});
