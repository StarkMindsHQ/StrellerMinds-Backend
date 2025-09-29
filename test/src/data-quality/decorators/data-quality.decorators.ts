import { applyDecorators, SetMetadata } from '@nestjs/common';
import { IsNotEmpty, IsEmail, IsString, IsNumber, IsDate, IsOptional, ValidateNested, IsEnum, IsUUID, IsBoolean, Min, Max, Length, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Metadata keys for data quality rules
export const DATA_QUALITY_RULES_KEY = 'data_quality_rules';
export const DATA_QUALITY_ENTITY_KEY = 'data_quality_entity';

// Data quality rule types
export enum DataQualityRuleType {
  COMPLETENESS = 'completeness',
  ACCURACY = 'accuracy',
  CONSISTENCY = 'consistency',
  VALIDITY = 'validity',
  UNIQUENESS = 'uniqueness',
  TIMELINESS = 'timeliness',
  CONFORMITY = 'conformity',
}

// Data quality severity levels
export enum DataQualitySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Interface for data quality rule metadata
export interface DataQualityRuleMetadata {
  ruleType: DataQualityRuleType;
  severity: DataQualitySeverity;
  threshold?: number;
  message?: string;
  autoFix?: boolean;
  conditions?: Record<string, any>;
}

// Base decorator for data quality rules
export function DataQualityRule(metadata: DataQualityRuleMetadata) {
  return SetMetadata(DATA_QUALITY_RULES_KEY, metadata);
}

// Mark entity for data quality monitoring
export function DataQualityEntity(entityType: string) {
  return SetMetadata(DATA_QUALITY_ENTITY_KEY, entityType);
}

// Completeness decorators
export function RequiredField(message?: string, severity: DataQualitySeverity = DataQualitySeverity.HIGH) {
  return applyDecorators(
    IsNotEmpty({ message: message || 'Field is required' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.COMPLETENESS,
      severity,
      threshold: 100,
      message: message || 'Field must not be empty',
    })
  );
}

export function OptionalField() {
  return IsOptional();
}

// Accuracy decorators
export function ValidEmail(severity: DataQualitySeverity = DataQualitySeverity.HIGH) {
  return applyDecorators(
    IsEmail({}, { message: 'Must be a valid email address' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'Email format is invalid',
    })
  );
}

export function ValidString(minLength?: number, maxLength?: number, severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  const decorators = [
    IsString({ message: 'Must be a string' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'String format is invalid',
    })
  ];

  if (minLength !== undefined || maxLength !== undefined) {
    decorators.push(Length(minLength || 0, maxLength || 1000, {
      message: `String length must be between ${minLength || 0} and ${maxLength || 1000} characters`
    }));
  }

  return applyDecorators(...decorators);
}

export function ValidNumber(min?: number, max?: number, severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  const decorators = [
    IsNumber({}, { message: 'Must be a number' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'Number format is invalid',
    })
  ];

  if (min !== undefined) {
    decorators.push(Min(min, { message: `Number must be at least ${min}` }));
  }

  if (max !== undefined) {
    decorators.push(Max(max, { message: `Number must not exceed ${max}` }));
  }

  return applyDecorators(...decorators);
}

export function ValidDate(severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  return applyDecorators(
    IsDate({ message: 'Must be a valid date' }),
    Type(() => Date),
    Transform(({ value }) => value instanceof Date ? value : new Date(value)),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'Date format is invalid',
    })
  );
}

export function ValidUUID(severity: DataQualitySeverity = DataQualitySeverity.HIGH) {
  return applyDecorators(
    IsUUID('4', { message: 'Must be a valid UUID' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'UUID format is invalid',
    })
  );
}

export function ValidBoolean(severity: DataQualitySeverity = DataQualitySeverity.LOW) {
  return applyDecorators(
    IsBoolean({ message: 'Must be a boolean value' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'Boolean format is invalid',
    })
  );
}

// Pattern matching decorator
export function ValidPattern(pattern: RegExp, message?: string, severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  return applyDecorators(
    Matches(pattern, { message: message || 'Does not match required pattern' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.CONFORMITY,
      severity,
      threshold: 100,
      message: message || 'Pattern validation failed',
      conditions: { pattern: pattern.source },
    })
  );
}

// Enum validation decorator
export function ValidEnum<T>(enumObject: T, severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  return applyDecorators(
    IsEnum(enumObject, { message: 'Must be a valid enum value' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.VALIDITY,
      severity,
      threshold: 100,
      message: 'Enum validation failed',
      conditions: { allowedValues: Object.values(enumObject as any) },
    })
  );
}

// Uniqueness decorator (for use with custom validation)
export function UniqueField(scope?: string[], severity: DataQualitySeverity = DataQualitySeverity.HIGH) {
  return DataQualityRule({
    ruleType: DataQualityRuleType.UNIQUENESS,
    severity,
    threshold: 100,
    message: 'Field value must be unique',
    conditions: { scope: scope || [] },
  });
}

// Timeliness decorator
export function TimelyField(maxAgeHours: number, severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  return DataQualityRule({
    ruleType: DataQualityRuleType.TIMELINESS,
    severity,
    threshold: 100,
    message: `Field value is too old (max age: ${maxAgeHours} hours)`,
    conditions: { maxAge: maxAgeHours },
  });
}

// Consistency decorators
export function ConsistentWith(relatedField: string, operator: 'equals' | 'greater_than' | 'less_than' = 'equals', severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  return DataQualityRule({
    ruleType: DataQualityRuleType.CONSISTENCY,
    severity,
    threshold: 100,
    message: `Field must be consistent with ${relatedField}`,
    conditions: {
      rules: [{
        field1: 'current_field',
        field2: relatedField,
        operator,
      }],
    },
  });
}

// Nested object validation
export function ValidNested(severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  return applyDecorators(
    ValidateNested(),
    DataQualityRule({
      ruleType: DataQualityRuleType.CONFORMITY,
      severity,
      threshold: 100,
      message: 'Nested object validation failed',
    })
  );
}

// Phone number validation
export function ValidPhoneNumber(severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
  return applyDecorators(
    Matches(phonePattern, { message: 'Must be a valid phone number' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'Phone number format is invalid',
      conditions: { pattern: phonePattern.source },
    })
  );
}

// URL validation
export function ValidURL(severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
  return applyDecorators(
    Matches(urlPattern, { message: 'Must be a valid URL' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'URL format is invalid',
      conditions: { pattern: urlPattern.source },
    })
  );
}

// Credit card validation
export function ValidCreditCard(severity: DataQualitySeverity = DataQualitySeverity.HIGH) {
  const ccPattern = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/;
  return applyDecorators(
    Matches(ccPattern, { message: 'Must be a valid credit card number' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'Credit card format is invalid',
      conditions: { pattern: ccPattern.source },
    })
  );
}

// Social Security Number validation (US format)
export function ValidSSN(severity: DataQualitySeverity = DataQualitySeverity.CRITICAL) {
  const ssnPattern = /^(?!666|000|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0{4})\\d{4}$/;
  return applyDecorators(
    Matches(ssnPattern, { message: 'Must be a valid SSN format (XXX-XX-XXXX)' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'SSN format is invalid',
      conditions: { pattern: ssnPattern.source },
    })
  );
}

// IP Address validation
export function ValidIPAddress(severity: DataQualitySeverity = DataQualitySeverity.MEDIUM) {
  const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return applyDecorators(
    Matches(ipPattern, { message: 'Must be a valid IP address' }),
    DataQualityRule({
      ruleType: DataQualityRuleType.ACCURACY,
      severity,
      threshold: 100,
      message: 'IP address format is invalid',
      conditions: { pattern: ipPattern.source },
    })
  );
}
