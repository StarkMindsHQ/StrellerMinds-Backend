import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  RequiredField,
  ValidEmail,
  ValidString,
  ValidNumber,
  ValidDate,
  ValidUUID,
  ValidBoolean,
  ValidPattern,
  ValidEnum,
  ValidPhoneNumber,
  ValidURL,
  ValidCreditCard,
  ValidIPAddress,
  DataQualityEntity,
  DataQualitySeverity,
} from '../decorators/data-quality.decorators';

enum TestEnum {
  VALUE1 = 'value1',
  VALUE2 = 'value2',
}

@DataQualityEntity('test-entity')
class TestEntity {
  @RequiredField('Name is required', DataQualitySeverity.HIGH)
  name: string;

  @ValidEmail(DataQualitySeverity.HIGH)
  email: string;

  @ValidString(3, 50, DataQualitySeverity.MEDIUM)
  description: string;

  @ValidNumber(0, 100, DataQualitySeverity.MEDIUM)
  score: number;

  @ValidDate(DataQualitySeverity.LOW)
  createdAt: Date;

  @ValidUUID(DataQualitySeverity.HIGH)
  id: string;

  @ValidBoolean(DataQualitySeverity.LOW)
  isActive: boolean;

  @ValidPattern(/^[A-Z]{2,3}$/, 'Must be 2-3 uppercase letters', DataQualitySeverity.MEDIUM)
  code: string;

  @ValidEnum(TestEnum, DataQualitySeverity.MEDIUM)
  status: TestEnum;

  @ValidPhoneNumber(DataQualitySeverity.MEDIUM)
  phone: string;

  @ValidURL(DataQualitySeverity.MEDIUM)
  website: string;

  @ValidCreditCard(DataQualitySeverity.HIGH)
  creditCard: string;

  @ValidIPAddress(DataQualitySeverity.MEDIUM)
  ipAddress: string;
}

describe('Data Quality Decorators', () => {
  describe('RequiredField', () => {
    it('should pass validation for non-empty values', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const nameErrors = errors.filter((error) => error.property === 'name');
      expect(nameErrors).toHaveLength(0);
    });

    it('should fail validation for empty values', async () => {
      const entity = plainToClass(TestEntity, {
        name: '',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const nameErrors = errors.filter((error) => error.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
      expect(nameErrors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('ValidEmail', () => {
    it('should pass validation for valid email', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john.doe@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const emailErrors = errors.filter((error) => error.property === 'email');
      expect(emailErrors).toHaveLength(0);
    });

    it('should fail validation for invalid email', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'invalid-email',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const emailErrors = errors.filter((error) => error.property === 'email');
      expect(emailErrors.length).toBeGreaterThan(0);
      expect(emailErrors[0].constraints).toHaveProperty('isEmail');
    });
  });

  describe('ValidString', () => {
    it('should pass validation for string within length limits', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Valid description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const descriptionErrors = errors.filter((error) => error.property === 'description');
      expect(descriptionErrors).toHaveLength(0);
    });

    it('should fail validation for string too short', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Hi',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const descriptionErrors = errors.filter((error) => error.property === 'description');
      expect(descriptionErrors.length).toBeGreaterThan(0);
      expect(descriptionErrors[0].constraints).toHaveProperty('length');
    });
  });

  describe('ValidNumber', () => {
    it('should pass validation for number within range', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 75,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const scoreErrors = errors.filter((error) => error.property === 'score');
      expect(scoreErrors).toHaveLength(0);
    });

    it('should fail validation for number out of range', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 150,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const scoreErrors = errors.filter((error) => error.property === 'score');
      expect(scoreErrors.length).toBeGreaterThan(0);
      expect(scoreErrors[0].constraints).toHaveProperty('max');
    });
  });

  describe('ValidUUID', () => {
    it('should pass validation for valid UUID', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const idErrors = errors.filter((error) => error.property === 'id');
      expect(idErrors).toHaveLength(0);
    });

    it('should fail validation for invalid UUID', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: 'invalid-uuid',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const idErrors = errors.filter((error) => error.property === 'id');
      expect(idErrors.length).toBeGreaterThan(0);
      expect(idErrors[0].constraints).toHaveProperty('isUuid');
    });
  });

  describe('ValidPattern', () => {
    it('should pass validation for matching pattern', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const codeErrors = errors.filter((error) => error.property === 'code');
      expect(codeErrors).toHaveLength(0);
    });

    it('should fail validation for non-matching pattern', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'abc',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const codeErrors = errors.filter((error) => error.property === 'code');
      expect(codeErrors.length).toBeGreaterThan(0);
      expect(codeErrors[0].constraints).toHaveProperty('matches');
    });
  });

  describe('ValidPhoneNumber', () => {
    it('should pass validation for valid phone number', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const phoneErrors = errors.filter((error) => error.property === 'phone');
      expect(phoneErrors).toHaveLength(0);
    });

    it('should fail validation for invalid phone number', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: 'invalid-phone',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const phoneErrors = errors.filter((error) => error.property === 'phone');
      expect(phoneErrors.length).toBeGreaterThan(0);
      expect(phoneErrors[0].constraints).toHaveProperty('matches');
    });
  });

  describe('ValidURL', () => {
    it('should pass validation for valid URL', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://www.example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const websiteErrors = errors.filter((error) => error.property === 'website');
      expect(websiteErrors).toHaveLength(0);
    });

    it('should fail validation for invalid URL', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'not-a-url',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const websiteErrors = errors.filter((error) => error.property === 'website');
      expect(websiteErrors.length).toBeGreaterThan(0);
      expect(websiteErrors[0].constraints).toHaveProperty('matches');
    });
  });

  describe('ValidIPAddress', () => {
    it('should pass validation for valid IP address', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '192.168.1.1',
      });

      const errors = await validate(entity);
      const ipErrors = errors.filter((error) => error.property === 'ipAddress');
      expect(ipErrors).toHaveLength(0);
    });

    it('should fail validation for invalid IP address', async () => {
      const entity = plainToClass(TestEntity, {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        score: 85,
        createdAt: new Date(),
        id: '123e4567-e89b-12d3-a456-426614174000',
        isActive: true,
        code: 'ABC',
        status: TestEnum.VALUE1,
        phone: '+1234567890',
        website: 'https://example.com',
        creditCard: '4111111111111111',
        ipAddress: '999.999.999.999',
      });

      const errors = await validate(entity);
      const ipErrors = errors.filter((error) => error.property === 'ipAddress');
      expect(ipErrors.length).toBeGreaterThan(0);
      expect(ipErrors[0].constraints).toHaveProperty('matches');
    });
  });
});
