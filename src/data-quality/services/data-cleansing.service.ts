import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';

export interface CleansingRule {
  id: string;
  name: string;
  field: string;
  operation: string;
  parameters?: Record<string, any>;
}

export interface CleansingResult {
  originalCount: number;
  cleanedCount: number;
  removedCount: number;
  modifiedCount: number;
  issues: string[];
  cleanedData: any[];
}

@Injectable()
export class DataCleansingService {
  private readonly logger = new Logger(DataCleansingService.name);

  private readonly cleansingQueue: Queue;

  constructor() {
    this.cleansingQueue = new Queue('data-cleansing');
  }

  async cleanseData(data: any[], rules: CleansingRule[]): Promise<CleansingResult> {
    try {
      let cleanedData = [...data];
      const result: CleansingResult = {
        originalCount: data.length,
        cleanedCount: 0,
        removedCount: 0,
        modifiedCount: 0,
        issues: [],
        cleanedData: [],
      };

      for (const rule of rules) {
        const ruleResult = await this.applyCleansingRule(cleanedData, rule);
        cleanedData = ruleResult.data;
        result.issues.push(...ruleResult.issues);
        result.modifiedCount += ruleResult.modifiedCount;
        result.removedCount += ruleResult.removedCount;
      }

      result.cleanedData = cleanedData;
      result.cleanedCount = cleanedData.length;

      // Queue for background processing if needed
      if (data.length > 1000) {
        await this.cleansingQueue.add('process-cleansing-result', {
          result,
          timestamp: new Date(),
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Data cleansing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async applyCleansingRule(
    data: any[],
    rule: CleansingRule,
  ): Promise<{
    data: any[];
    modifiedCount: number;
    removedCount: number;
    issues: string[];
  }> {
    const result = {
      data: [...data],
      modifiedCount: 0,
      removedCount: 0,
      issues: [],
    };

    switch (rule.operation) {
      case 'remove_nulls':
        result.data = result.data.filter((item) => {
          const hasNull = item[rule.field] === null || item[rule.field] === undefined;
          if (hasNull) result.removedCount++;
          return !hasNull;
        });
        break;

      case 'remove_duplicates':
        const seen = new Set();
        const originalLength = result.data.length;
        result.data = result.data.filter((item) => {
          const key = rule.parameters?.fields
            ? rule.parameters.fields.map((f: string) => item[f]).join('|')
            : item[rule.field];

          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
        result.removedCount += originalLength - result.data.length;
        break;

      case 'trim_whitespace':
        result.data.forEach((item) => {
          if (typeof item[rule.field] === 'string') {
            const original = item[rule.field];
            item[rule.field] = item[rule.field].trim();
            if (original !== item[rule.field]) {
              result.modifiedCount++;
            }
          }
        });
        break;

      case 'normalize_case':
        const caseType = rule.parameters?.case || 'lower';
        result.data.forEach((item) => {
          if (typeof item[rule.field] === 'string') {
            const original = item[rule.field];
            item[rule.field] =
              caseType === 'upper'
                ? item[rule.field].toUpperCase()
                : item[rule.field].toLowerCase();
            if (original !== item[rule.field]) {
              result.modifiedCount++;
            }
          }
        });
        break;

      case 'standardize_format':
        const format = rule.parameters?.format;
        result.data.forEach((item) => {
          if (item[rule.field]) {
            const original = item[rule.field];
            try {
              switch (format) {
                case 'phone':
                  item[rule.field] = this.standardizePhone(item[rule.field]);
                  break;
                case 'email':
                  item[rule.field] = this.standardizeEmail(item[rule.field]);
                  break;
                case 'date':
                  item[rule.field] = this.standardizeDate(item[rule.field]);
                  break;
              }
              if (original !== item[rule.field]) {
                result.modifiedCount++;
              }
            } catch (error) {
              result.issues.push(`Failed to standardize ${rule.field} for item: ${error.message}`);
            }
          }
        });
        break;

      case 'fill_missing':
        const fillValue = rule.parameters?.value || rule.parameters?.defaultValue;
        result.data.forEach((item) => {
          if (
            item[rule.field] === null ||
            item[rule.field] === undefined ||
            item[rule.field] === ''
          ) {
            item[rule.field] = fillValue;
            result.modifiedCount++;
          }
        });
        break;

      case 'remove_outliers':
        const threshold = rule.parameters?.threshold || 3; // standard deviations
        const values = result.data
          .map((item) => item[rule.field])
          .filter((val) => typeof val === 'number');

        if (values.length > 0) {
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const stdDev = Math.sqrt(
            values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length,
          );

          const originalLength = result.data.length;
          result.data = result.data.filter((item) => {
            if (typeof item[rule.field] === 'number') {
              const zScore = Math.abs((item[rule.field] - mean) / stdDev);
              return zScore <= threshold;
            }
            return true;
          });
          result.removedCount += originalLength - result.data.length;
        }
        break;

      case 'validate_and_fix':
        const validator = rule.parameters?.validator;
        const fixer = rule.parameters?.fixer;

        result.data.forEach((item) => {
          if (!this.validateValue(item[rule.field], validator)) {
            const original = item[rule.field];
            item[rule.field] = this.fixValue(item[rule.field], fixer);
            if (original !== item[rule.field]) {
              result.modifiedCount++;
            }
          }
        });
        break;

      default:
        result.issues.push(`Unknown cleansing operation: ${rule.operation}`);
    }

    return result;
  }

  private standardizePhone(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    return phone; // Return original if can't standardize
  }

  private standardizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private standardizeDate(date: string | Date): string {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date format');
    }
    return dateObj.toISOString();
  }

  private validateValue(value: any, validator: any): boolean {
    if (!validator) return true;

    switch (validator.type) {
      case 'regex':
        return new RegExp(validator.pattern).test(value);
      case 'range':
        return value >= validator.min && value <= validator.max;
      case 'length':
        return value.length >= validator.min && value.length <= validator.max;
      default:
        return true;
    }
  }

  private fixValue(value: any, fixer: any): any {
    if (!fixer) return value;

    switch (fixer.type) {
      case 'default':
        return fixer.value;
      case 'truncate':
        return typeof value === 'string' ? value.substring(0, fixer.length) : value;
      case 'pad':
        return typeof value === 'string' ? value.padStart(fixer.length, fixer.char || '0') : value;
      default:
        return value;
    }
  }

  async getCleansingRules(entityType: string): Promise<CleansingRule[]> {
    // This would typically come from a database
    // For now, return some default rules
    return [
      {
        id: '1',
        name: 'Remove Nulls',
        field: 'email',
        operation: 'remove_nulls',
      },
      {
        id: '2',
        name: 'Trim Whitespace',
        field: 'name',
        operation: 'trim_whitespace',
      },
      {
        id: '3',
        name: 'Normalize Email',
        field: 'email',
        operation: 'standardize_format',
        parameters: { format: 'email' },
      },
    ];
  }
}
