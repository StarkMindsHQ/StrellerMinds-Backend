import { Test } from '@nestjs/testing';
/**
 * Creates a testing module with the provided metadata
 * @param metadata Module metadata for test configuration
 * @returns TestingModule instance
 */
export const createTestingModule = async (metadata) => {
    return Test.createTestingModule(metadata).compile();
};
/**
 * Creates a mock repository with basic CRUD operations
 * @returns Mock repository object
 */
export const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
});
/**
 * Creates test JWT token
 * @param userId User ID to include in token
 * @returns Mock JWT token
 */
export const createTestToken = (userId) => `test-token-${userId}`;
/**
 * Generates random test data
 * @returns Test data object
 */
export const createTestData = () => ({
    id: Math.random().toString(36).substring(7),
    createdAt: new Date(),
    updatedAt: new Date(),
});
/**
 * Mock service response wrapper
 * @param data Data to wrap in response
 * @returns Mocked service response
 */
export const mockServiceResponse = (data) => ({
    success: true,
    data,
    message: 'Success',
});
