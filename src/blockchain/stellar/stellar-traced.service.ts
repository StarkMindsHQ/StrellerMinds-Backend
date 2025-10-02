import { Injectable, Logger } from '@nestjs/common';
import { TracingService } from '../../tracing/tracing.service';
import { TracedHttpService } from '../../tracing/traced-http.service';
import { TraceBlockchain } from '../../tracing/tracing.decorators';

@Injectable()
export class StellarTracedService {
  private readonly logger = new Logger(StellarTracedService.name);

  constructor(
    private readonly tracingService: TracingService,
    private readonly tracedHttpService: TracedHttpService,
  ) {}

  /**
   * Create a trustline to a custom asset with tracing
   */
  @TraceBlockchain('stellar', 'createTrustline')
  async createTrustline(sourceSecret: string, assetCode: string, issuer: string) {
    return this.tracingService.withSpan(
      'blockchain.stellar.createTrustline',
      async (span) => {
        span.setAttributes({
          'blockchain.operation': 'createTrustline',
          'blockchain.asset.code': assetCode,
          'blockchain.asset.issuer': issuer,
          'blockchain.network': 'testnet',
        });

        try {
          // Simulate the trustline creation process
          const startTime = Date.now();

          // Step 1: Load account
          await this.loadAccount(sourceSecret, span);

          // Step 2: Build transaction
          const transaction = await this.buildTrustlineTransaction(assetCode, issuer, span);

          // Step 3: Submit transaction
          const response = await this.submitTransaction(transaction, span);

          const duration = Date.now() - startTime;
          span.setAttributes({
            'blockchain.transaction.hash': response.hash,
            'blockchain.operation.duration_ms': duration,
            'blockchain.operation.success': true,
          });

          this.logger.log(`Trustline created: ${response.hash}`);
          return response;
        } catch (error) {
          span.setAttributes({
            'blockchain.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error('Error creating trustline', error);
          throw error;
        }
      },
      {
        'blockchain.name': 'stellar',
        'blockchain.operation': 'createTrustline',
      },
    );
  }

  /**
   * Monitor transaction with tracing
   */
  @TraceBlockchain('stellar', 'monitorTransaction')
  async monitorTransaction(txHash: string) {
    return this.tracingService.withSpan(
      'blockchain.stellar.monitorTransaction',
      async (span) => {
        span.setAttributes({
          'blockchain.transaction.hash': txHash,
          'blockchain.network': 'testnet',
        });

        try {
          const response = await this.tracedHttpService.get(
            `https://horizon-testnet.stellar.org/transactions/${txHash}`,
            {
              serviceName: 'stellar-horizon',
              operation: 'getTransaction',
            },
          );

          span.setAttributes({
            'blockchain.transaction.status': response.data.status,
            'blockchain.transaction.success': response.data.successful,
          });

          return response.data;
        } catch (error) {
          span.setAttributes({
            'blockchain.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          throw error;
        }
      },
      {
        'blockchain.name': 'stellar',
        'blockchain.operation': 'monitorTransaction',
      },
    );
  }

  /**
   * Invoke smart contract with tracing
   */
  @TraceBlockchain('stellar', 'invokeSmartContract')
  async invokeSmartContract({
    contractAddress,
    method,
    args,
  }: {
    contractAddress: string;
    method: string;
    args: any[];
  }) {
    return this.tracingService.withSpan(
      'blockchain.stellar.invokeSmartContract',
      async (span) => {
        span.setAttributes({
          'blockchain.contract.address': contractAddress,
          'blockchain.contract.method': method,
          'blockchain.contract.args.count': args.length,
          'blockchain.network': 'futurenet',
        });

        try {
          const payload = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'simulateTransaction',
            params: {
              transaction: {
                source: 'G...',
                contractAddress,
                function: method,
                args,
              },
            },
          };

          const response = await this.tracedHttpService.post(
            'https://rpc-futurenet.stellar.org/soroban/rpc',
            payload,
            {
              serviceName: 'stellar-soroban',
              operation: 'simulateTransaction',
              includeRequestBody: true,
            },
          );

          span.setAttributes({
            'blockchain.contract.result.success': true,
            'blockchain.contract.response.size': JSON.stringify(response.data).length,
          });

          this.logger.log(`Soroban RPC [${method}] success`, response.data);
          return response.data;
        } catch (error) {
          span.setAttributes({
            'blockchain.contract.result.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error(`Soroban RPC failed: ${method}`, error);
          throw error;
        }
      },
      {
        'blockchain.name': 'stellar',
        'blockchain.operation': 'invokeSmartContract',
      },
    );
  }

  private async loadAccount(sourceSecret: string, parentSpan: any) {
    return this.tracingService.withSpan(
      'blockchain.stellar.loadAccount',
      async (span) => {
        span.setAttributes({
          'blockchain.operation': 'loadAccount',
          'blockchain.account.type': 'source',
        });

        // Simulate account loading
        await new Promise((resolve) => setTimeout(resolve, 100));

        span.setAttributes({
          'blockchain.account.loaded': true,
        });

        return { publicKey: 'G...', sequence: '123' };
      },
      {
        'blockchain.name': 'stellar',
        'blockchain.operation': 'loadAccount',
      },
    );
  }

  private async buildTrustlineTransaction(assetCode: string, issuer: string, parentSpan: any) {
    return this.tracingService.withSpan(
      'blockchain.stellar.buildTransaction',
      async (span) => {
        span.setAttributes({
          'blockchain.operation': 'buildTransaction',
          'blockchain.transaction.type': 'changeTrust',
          'blockchain.asset.code': assetCode,
          'blockchain.asset.issuer': issuer,
        });

        // Simulate transaction building
        await new Promise((resolve) => setTimeout(resolve, 50));

        span.setAttributes({
          'blockchain.transaction.built': true,
        });

        return { hash: 'tx_hash_' + Date.now() };
      },
      {
        'blockchain.name': 'stellar',
        'blockchain.operation': 'buildTransaction',
      },
    );
  }

  private async submitTransaction(transaction: any, parentSpan: any) {
    return this.tracingService.withSpan(
      'blockchain.stellar.submitTransaction',
      async (span) => {
        span.setAttributes({
          'blockchain.operation': 'submitTransaction',
        });

        // Simulate transaction submission
        await new Promise((resolve) => setTimeout(resolve, 200));

        const hash = 'tx_hash_' + Date.now();

        span.setAttributes({
          'blockchain.transaction.hash': hash,
          'blockchain.transaction.submitted': true,
        });

        return { hash, successful: true };
      },
      {
        'blockchain.name': 'stellar',
        'blockchain.operation': 'submitTransaction',
      },
    );
  }
}
