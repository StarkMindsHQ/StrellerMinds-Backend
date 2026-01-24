// test/utils/mock-factory.ts
// import * as sdk from '@stellar/stellar-sdk';
import { mockStellarSdk } from '../mocks/stellar-sdk.mock';
export function useMockStellar(success = true) {
    jest.resetModules();
    jest.mock('stellar-sdk', () => mockStellarSdk);
    if (!success) {
        mockStellarSdk.Server.mockImplementation(() => ({
            loadAccount: jest.fn(() => Promise.reject(new Error('Failed to load'))),
            submitTransaction: jest.fn(() => Promise.reject(new Error('Transaction failed'))),
        }));
    }
}
