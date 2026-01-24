// test/mocks/stellar-sdk.mock.ts
export const mockStellarSdk = {
    Server: jest.fn().mockImplementation(() => ({
        loadAccount: jest.fn(async (key) => {
            if (key === 'GINVALID')
                throw new Error('Account not found');
            return { accountId: key, sequence: '123' };
        }),
        submitTransaction: jest.fn(async () => {
            return { hash: 'mocked-hash' };
        }),
    })),
    Keypair: {
        fromSecret: jest.fn((secret) => {
            if (secret === 'SINVALID')
                throw new Error('Invalid secret');
            return { publicKey: () => 'GMOCKEDPUB' };
        }),
    },
    TransactionBuilder: jest.fn().mockImplementation(() => ({
        addOperation: jest.fn().mockReturnThis(),
        setTimeout: jest.fn().mockReturnThis(),
        build: jest.fn(() => ({
            sign: jest.fn(),
        })),
    })),
    Networks: { TESTNET: 'Test SDF Network ; September 2015' },
    BASE_FEE: '100',
};
