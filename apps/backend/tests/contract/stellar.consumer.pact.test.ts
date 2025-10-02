import { Pact, Matchers } from '@pact-foundation/pact';
import { StellarService } from '../../../src/blockchain/stellar/stellar.service';
import path from 'path';

describe('Stellar API Consumer Pact', () => {
  const provider = new Pact({
    consumer: 'StrellerMinds-Backend',
    provider: 'Stellar-Horizon-API',
    port: 1234,
    log: path.resolve(process.cwd(), 'logs', 'stellar-pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  let stellarService: StellarService;

  beforeAll(() => {
    return provider.setup().then(() => {
      // Create a new StellarService instance with the mock server URL
      stellarService = new StellarService();
      // Override the server URL to point to our mock server
      (stellarService as any).server = {
        loadAccount: jest.fn(),
        transactions: jest.fn().mockReturnValue({
          transaction: jest.fn().mockReturnValue({
            call: jest.fn(),
          }),
        }),
        submitTransaction: jest.fn(),
        fetchBaseFee: jest.fn(),
      };
    });
  });

  afterAll(() => {
    return provider.finalize();
  });

  describe('Stellar Service', () => {
    it('should fetch account details successfully', () => {
      const accountId = 'GABC1234567890XYZ';
      const expectedAccount = {
        id: accountId,
        account_id: accountId,
        sequence: '123456789',
        balances: [
          {
            balance: '1000.5000000',
            asset_type: 'native',
          },
          {
            balance: '500.0000000',
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: 'GXYZ9876543210ABC',
          },
        ],
        subentry_count: 2,
        last_modified_ledger: 12345,
        last_modified_time: '2023-12-01T10:00:00Z',
        flags: {
          auth_required: false,
          auth_revocable: false,
          auth_immutable: false,
        },
        thresholds: {
          low_threshold: 1,
          med_threshold: 2,
          high_threshold: 3,
        },
      };

      return provider
        .addInteraction({
          state: 'account exists',
          uponReceiving: 'a request for account details',
          withRequest: {
            method: 'GET',
            path: `/accounts/${accountId}`,
            headers: {
              Accept: 'application/json',
            },
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: Matchers.like(accountId),
              account_id: Matchers.like(accountId),
              sequence: Matchers.like('123456789'),
              balances: Matchers.eachLike(
                {
                  balance: Matchers.decimal(1000.5),
                  asset_type: Matchers.like('native'),
                },
                { min: 1 },
              ),
              subentry_count: Matchers.integer(2),
              last_modified_ledger: Matchers.integer(12345),
              last_modified_time: Matchers.iso8601DateTime('2023-12-01T10:00:00Z'),
              flags: {
                auth_required: Matchers.boolean(false),
                auth_revocable: Matchers.boolean(false),
                auth_immutable: Matchers.boolean(false),
              },
              thresholds: {
                low_threshold: Matchers.integer(1),
                med_threshold: Matchers.integer(2),
                high_threshold: Matchers.integer(3),
              },
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the server.loadAccount method to return our expected response
            (stellarService as any).server.loadAccount.mockResolvedValue(expectedAccount);

            // Call the actual service method
            const result = await stellarService.createTrustline(
              'test-secret',
              'USDC',
              'GXYZ9876543210ABC',
            );

            // Assert the result
            expect(result).toBeDefined();
            expect(result.hash).toBeDefined();
          });
        });
    });

    it('should handle account not found error', () => {
      const accountId = 'GINVALID123456789';

      return provider
        .addInteraction({
          state: 'account does not exist',
          uponReceiving: 'a request for non-existent account details',
          withRequest: {
            method: 'GET',
            path: `/accounts/${accountId}`,
            headers: {
              Accept: 'application/json',
            },
          },
          willRespondWith: {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              type: Matchers.like('https://stellar.org/horizon-errors/not_found'),
              title: Matchers.like('Resource Missing'),
              status: Matchers.integer(404),
              detail: Matchers.like(
                'The resource at the url requested was not found. This is usually occurs for one of two reasons:  The url requested is not valid, or no data in our database could be found with the parameters provided.',
              ),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the server.loadAccount method to throw an error
            (stellarService as any).server.loadAccount.mockRejectedValue(
              new Error('Account not found'),
            );

            // Call the service method and expect it to throw
            await expect(
              stellarService.createTrustline('test-secret', 'USDC', 'GXYZ9876543210ABC'),
            ).rejects.toThrow('Blockchain error: Account not found');
          });
        });
    });

    it('should fetch transaction details successfully', () => {
      const transactionHash = 'abc123def456ghi789';
      const expectedTransaction = {
        id: transactionHash,
        successful: true,
        ledger: 12345,
        created_at: '2023-12-01T10:00:00Z',
        fee_charged: '0.0000100',
        operation_count: 1,
        result_meta_xdr: 'AAAAAQAAAAIAAAADAAAAAAAAAAEAAAABAAAAAA==',
        result_xdr: 'AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAA=',
        signatures: ['signature1', 'signature2'],
      };

      return provider
        .addInteraction({
          state: 'transaction exists',
          uponReceiving: 'a request for transaction details',
          withRequest: {
            method: 'GET',
            path: `/transactions/${transactionHash}`,
            headers: {
              Accept: 'application/json',
            },
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: Matchers.like(transactionHash),
              successful: Matchers.boolean(true),
              ledger: Matchers.integer(12345),
              created_at: Matchers.iso8601DateTime('2023-12-01T10:00:00Z'),
              fee_charged: Matchers.decimal(0.00001),
              operation_count: Matchers.integer(1),
              result_meta_xdr: Matchers.like('AAAAAQAAAAIAAAADAAAAAAAAAAEAAAABAAAAAA=='),
              result_xdr: Matchers.like('AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAA='),
              signatures: Matchers.eachLike(Matchers.like('signature1')),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the transaction monitoring method
            (stellarService as any).server
              .transactions()
              .transaction()
              .call.mockResolvedValue(expectedTransaction);

            // Call the actual service method
            const result = await stellarService.monitorTransaction(transactionHash);

            // Assert the result
            expect(result).toBeDefined();
            expect(result.id).toBe(transactionHash);
            expect(result.successful).toBe(true);
            expect(result.ledger).toBe(12345);
          });
        });
    });
  });
});
