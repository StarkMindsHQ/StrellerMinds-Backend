import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * Base factory class with common functionality for all test factories
 */
export abstract class BaseFactory<T> {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Create a single entity
   */
  abstract create(overrides?: Partial<T>): Promise<T>;

  /**
   * Create multiple entities
   */
  async createMany(count: number, overrides?: Partial<T>): Promise<T[]> {
    const entities: T[] = [];
    for (let i = 0; i < count; i++) {
      entities.push(await this.create(overrides));
    }
    return entities;
  }

  /**
   * Generate entity data without persisting
   */
  abstract generate(overrides?: Partial<T>): T;

  /**
   * Generate multiple entities without persisting
   */
  generateMany(count: number, overrides?: Partial<T>): T[] {
    const entities: T[] = [];
    for (let i = 0; i < count; i++) {
      entities.push(this.generate(overrides));
    }
    return entities;
  }

  /**
   * Save entity to database
   */
  protected async save(entity: T): Promise<T> {
    const repository = this.getRepository();
    return await repository.save(entity);
  }

  /**
   * Get the repository for this entity
   */
  protected abstract getRepository(): any;

  /**
   * Generate random string
   */
  protected randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random number between min and max
   */
  protected randomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random boolean
   */
  protected randomBoolean(): boolean {
    return Math.random() < 0.5;
  }

  /**
   * Generate random email
   */
  protected randomEmail(): string {
    const domains = ['test.com', 'example.com', 'strellerminds.test'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const username = this.randomString(8).toLowerCase();
    return `${username}@${domain}`;
  }

  /**
   * Generate random phone number
   */
  protected randomPhone(): string {
    const areaCode = this.randomNumber(200, 999);
    const prefix = this.randomNumber(200, 999);
    const lineNumber = this.randomNumber(1000, 9999);
    return `+1${areaCode}${prefix}${lineNumber}`;
  }

  /**
   * Pick random item from array
   */
  protected randomPick<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Pick multiple random items from array
   */
  protected randomPickMany<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * Generate random date within range
   */
  protected randomDate(start: Date = new Date(2020, 0, 1), end: Date = new Date()): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  /**
   * Generate random UUID
   */
  protected randomUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate random paragraph
   */
  protected randomParagraph(sentences: number = 3): string {
    const sentenceTemplates = [
      'This is a test sentence for {subject}.',
      'The {subject} demonstrates {behavior} in this context.',
      'We need to verify that {subject} works correctly.',
      'Testing {subject} requires careful consideration.',
      'The {subject} should handle {scenario} gracefully.',
    ];

    const subjects = ['the system', 'the user', 'the data', 'the process', 'the functionality'];
    const behaviors = ['expected behavior', 'proper validation', 'correct responses', 'appropriate actions'];
    const scenarios = ['edge cases', 'error conditions', 'normal operations', 'stress tests'];

    const paragraph = [];
    for (let i = 0; i < sentences; i++) {
      const template = this.randomPick(sentenceTemplates);
      const sentence = template
        .replace('{subject}', this.randomPick(subjects))
        .replace('{behavior}', this.randomPick(behaviors))
        .replace('{scenario}', this.randomPick(scenarios));
      paragraph.push(sentence);
    }

    return paragraph.join(' ');
  }
}
