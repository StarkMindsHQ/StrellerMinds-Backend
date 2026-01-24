import { faker } from '@faker-js/faker';
export class BaseFactory {
    constructor() {
        this.traits = {};
    }
    /**
     * Create a single instance
     */
    create(options = {}) {
        const { overrides = {}, traits = [] } = options;
        let data = this.definition();
        // Apply traits
        traits.forEach(trait => {
            if (this.traits[trait]) {
                data = { ...data, ...this.traits[trait]() };
            }
        });
        // Apply overrides
        data = { ...data, ...overrides };
        return data;
    }
    /**
     * Create multiple instances
     */
    createMany(count, options = {}) {
        return Array.from({ length: count }, () => this.create(options));
    }
    /**
     * Create with specific trait
     */
    withTrait(trait, options = {}) {
        return this.create({ ...options, traits: [...(options.traits || []), trait] });
    }
    /**
     * Create with multiple traits
     */
    withTraits(traits, options = {}) {
        return this.create({ ...options, traits: [...(options.traits || []), ...traits] });
    }
    /**
     * Build data without creating entity (useful for DTOs)
     */
    build(options = {}) {
        return this.create(options);
    }
    /**
     * Build many without creating entities
     */
    buildMany(count, options = {}) {
        return this.createMany(count, options);
    }
    /**
     * Create sequence of items with incremental values
     */
    sequence(count, callback) {
        return Array.from({ length: count }, (_, index) => {
            const sequenceData = callback(index);
            return this.create({ overrides: sequenceData });
        });
    }
    /**
     * Reset faker seed for consistent test data
     */
    static resetSeed(seed = 12345) {
        faker.seed(seed);
    }
    /**
     * Generate random ID
     */
    generateId() {
        return faker.string.uuid();
    }
    /**
     * Generate random email
     */
    generateEmail() {
        return faker.internet.email().toLowerCase();
    }
    /**
     * Generate random name
     */
    generateName() {
        return faker.person.fullName();
    }
    /**
     * Generate random text
     */
    generateText(sentences = 3) {
        return faker.lorem.sentences(sentences);
    }
    /**
     * Generate random date
     */
    generateDate(options = {}) {
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
    generateNumber(min = 1, max = 100) {
        return faker.number.int({ min, max });
    }
    /**
     * Generate random boolean
     */
    generateBoolean() {
        return faker.datatype.boolean();
    }
    /**
     * Generate random URL
     */
    generateUrl() {
        return faker.internet.url();
    }
    /**
     * Generate random phone number
     */
    generatePhone() {
        return faker.phone.number();
    }
    /**
     * Generate random address
     */
    generateAddress() {
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
    pickRandom(items) {
        return faker.helpers.arrayElement(items);
    }
    /**
     * Pick multiple random items from array
     */
    pickRandomMany(items, count) {
        return faker.helpers.arrayElements(items, count);
    }
    /**
     * Generate random slug
     */
    generateSlug() {
        return faker.lorem.slug();
    }
    /**
     * Generate random price
     */
    generatePrice(min = 10, max = 1000) {
        return parseFloat(faker.commerce.price({ min, max }));
    }
    /**
     * Generate random image URL
     */
    generateImageUrl(width = 400, height = 300) {
        return faker.image.url({ width, height });
    }
}
