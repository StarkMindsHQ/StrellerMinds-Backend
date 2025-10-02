import { faker } from '@faker-js/faker';

export interface FactoryOptions {
  count?: number;
  overrides?: Record<string, any>;
  traits?: string[];
}

export abstract class BaseFactory<T> {
  protected abstract definition(): Partial<T>;
  protected traits: Record<string, () => Partial<T>> = {};

  /**
   * Create a single instance
   */
  create(options: FactoryOptions = {}): T {
    const { overrides = {}, traits = [] } = options;

    let data = this.definition();

    // Apply traits
    traits.forEach((trait) => {
      if (this.traits[trait]) {
        data = { ...data, ...this.traits[trait]() };
      }
    });

    // Apply overrides
    data = { ...data, ...overrides };

    return data as T;
  }

  /**
   * Create multiple instances
   */
  createMany(count: number, options: Omit<FactoryOptions, 'count'> = {}): T[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  /**
   * Create with specific trait
   */
  withTrait(trait: string, options: FactoryOptions = {}): T {
    return this.create({ ...options, traits: [...(options.traits || []), trait] });
  }

  /**
   * Create with multiple traits
   */
  withTraits(traits: string[], options: FactoryOptions = {}): T {
    return this.create({ ...options, traits: [...(options.traits || []), ...traits] });
  }

  /**
   * Build data without creating entity (useful for DTOs)
   */
  build(options: FactoryOptions = {}): Partial<T> {
    return this.create(options);
  }

  /**
   * Build many without creating entities
   */
  buildMany(count: number, options: Omit<FactoryOptions, 'count'> = {}): Partial<T>[] {
    return this.createMany(count, options);
  }

  /**
   * Create sequence of items with incremental values
   */
  sequence(count: number, callback: (index: number) => Partial<T>): T[] {
    return Array.from({ length: count }, (_, index) => {
      const sequenceData = callback(index);
      return this.create({ overrides: sequenceData });
    });
  }

  /**
   * Reset faker seed for consistent test data
   */
  static resetSeed(seed: number = 12345): void {
    faker.seed(seed);
  }

  /**
   * Generate random ID
   */
  protected generateId(): string {
    return faker.string.uuid();
  }

  /**
   * Generate random email
   */
  protected generateEmail(): string {
    return faker.internet.email().toLowerCase();
  }

  /**
   * Generate random name
   */
  protected generateName(): string {
    return faker.person.fullName();
  }

  /**
   * Generate random text
   */
  protected generateText(sentences: number = 3): string {
    return faker.lorem.sentences(sentences);
  }

  /**
   * Generate random date
   */
  protected generateDate(options: { past?: boolean; future?: boolean; days?: number } = {}): Date {
    if (options.past) {
      return faker.date.past({ years: 1 });
    }
    if (options.future) {
      return faker.date.future({ years: 1 });
    }
    return faker.date.recent({ days: options.days || 30 });
  }

  /**
   * Generate random number
   */
  protected generateNumber(min: number = 1, max: number = 100): number {
    return faker.number.int({ min, max });
  }

  /**
   * Generate random boolean
   */
  protected generateBoolean(): boolean {
    return faker.datatype.boolean();
  }

  /**
   * Generate random URL
   */
  protected generateUrl(): string {
    return faker.internet.url();
  }

  /**
   * Generate random phone number
   */
  protected generatePhone(): string {
    return faker.phone.number();
  }

  /**
   * Generate random address
   */
  protected generateAddress(): any {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country(),
    };
  }

  /**
   * Pick random item from array
   */
  protected pickRandom<K>(items: K[]): K {
    return faker.helpers.arrayElement(items);
  }

  /**
   * Pick multiple random items from array
   */
  protected pickRandomMany<K>(items: K[], count: number): K[] {
    return faker.helpers.arrayElements(items, count);
  }

  /**
   * Generate random slug
   */
  protected generateSlug(): string {
    return faker.lorem.slug();
  }

  /**
   * Generate random price
   */
  protected generatePrice(min: number = 10, max: number = 1000): number {
    return parseFloat(faker.commerce.price({ min, max }));
  }

  /**
   * Generate random image URL
   */
  protected generateImageUrl(width: number = 400, height: number = 300): string {
    return faker.image.url({ width, height });
  }
}
