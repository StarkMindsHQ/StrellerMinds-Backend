import { Injectable, Logger, Inject } from '@nestjs/common';
import { Keypair, TransactionBuilder, Networks, Operation, Asset, Horizon } from 'stellar-sdk';
import axios from 'axios';
import { exec } from 'child_process';
import { ConfigType } from '@nestjs/config';
import stellarConfig, { StellarConfig, StellarNetworkConfig } from '../../config/stellar.config';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly config: StellarConfig;
  private readonly server: Horizon.Server;
  private readonly networkPassphrase: string;

  constructor(
    @Inject(stellarConfig.KEY)
    private readonly stellarConfigService: ConfigType<typeof stellarConfig>,
  ) {
    this.config = stellarConfigService;
    // Use default network from configuration
    const networkConfig = this.getNetworkConfig(this.config.defaultNetwork);
    this.server = new Horizon.Server(networkConfig.horizonUrl);
    this.networkPassphrase = networkConfig.networkPassphrase;
  }

  /**
   * Get network configuration for specified network
   */
  private getNetworkConfig(network: 'mainnet' | 'testnet'): StellarNetworkConfig {
    return this.config.networks[network];
  }

  /**
   * Get server instance for specific network
   */
  private getServerForNetwork(network: 'mainnet' | 'testnet'): Horizon.Server {
    const networkConfig = this.getNetworkConfig(network);
    return new Horizon.Server(networkConfig.horizonUrl);
  }

  /**
   * Create a trustline to a custom asset
   */
  async createTrustline(sourceSecret: string, assetCode: string, issuer: string) {
    try {
      const sourceKeypair = Keypair.fromSecret(sourceSecret);
      const account = await this.server.loadAccount(sourceKeypair.publicKey());

      const asset = new Asset(assetCode, issuer);

      const tx = new TransactionBuilder(account, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.changeTrust({ asset }))
        .setTimeout(30)
        .build();

      tx.sign(sourceKeypair);

      const response = await this.server.submitTransaction(tx);
      this.logger.log(`Trustline created: ${response.hash}`);

      await this.logBlockchainAction('createTrustline', { assetCode, issuer }, response);

      return response;
    } catch (err: any) {
      this.logger.error('Error creating trustline', err?.response?.data || err);
      await this.logBlockchainAction('createTrustline', { assetCode, issuer }, null, err);
      throw new Error(
        `Blockchain error: ${err.response?.data?.extras?.result_codes?.operations || err.message}`,
      );
    }
  }

  /**
   * Monitor a transaction by hash with timeout and retry logic
   */
  async monitorTransaction(txHash: string, network?: 'mainnet' | 'testnet'): Promise<any> {
    if (!txHash || typeof txHash !== 'string') {
      throw new Error('Invalid transaction hash provided');
    }

    const targetNetwork = network || this.config.defaultNetwork;
    const server = network ? this.getServerForNetwork(network) : this.server;

    return this.withTimeoutAndRetry(async () => {
      try {
        const tx = await server.transactions().transaction(txHash).call();
        this.logger.log(`Transaction ${txHash} confirmed on ${targetNetwork}: ${tx.ledger}`);
        return tx;
      } catch (err: any) {
        if (err.response?.status === 404) {
          throw new Error(`Transaction ${txHash} not found on ${targetNetwork} network`);
        }
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
          throw new Error(
            `Network connection failed for ${targetNetwork}: Unable to reach Horizon server`,
          );
        }
        throw new Error(`Failed to fetch transaction ${txHash}: ${err.message}`);
      }
    }, `monitorTransaction(${txHash})`);
  }

  /**
   * Wrapper for operations with timeout and retry logic
   */
  private async withTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Add timeout to the operation
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`Operation ${operationName} timed out after ${this.config.timeout}ms`),
                ),
              this.config.timeout,
            ),
          ),
        ]);

        if (attempt > 1) {
          this.logger.log(`${operationName} succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.config.retryAttempts) {
          this.logger.error(
            `${operationName} failed after ${attempt} attempts: ${lastError.message}`,
          );
          throw lastError;
        }

        this.logger.warn(
          `${operationName} attempt ${attempt} failed: ${lastError.message}. Retrying in ${this.config.retryDelay}ms...`,
        );

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));
      }
    }

    throw lastError!;
  }

  /**
   * Soroban contract invocation via RPC
   */
  async invokeSmartContract({
    contractAddress,
    method,
    args,
  }: {
    contractAddress: string;
    method: string;
    args: any[];
  }): Promise<any> {
    try {
      const url = 'https://rpc-futurenet.stellar.org/soroban/rpc';

      const payload = {
        jsonrpc: '2.0',
        id: 8675309,
        method: 'simulateTransaction',
        params: {
          transaction: {
            source: 'G...', // Placeholder: replace with source public key or signer
            contractAddress,
            function: method,
            args,
          },
        },
      };

      const { data } = await axios.post(url, payload);
      this.logger.log(`Soroban RPC [${method}] success`, data);

      await this.logBlockchainAction(
        'invokeSmartContract',
        { contractAddress, method, args },
        data,
      );

      return data;
    } catch (err: any) {
      this.logger.error(`Soroban RPC failed: ${method}`, err?.response?.data || err);
      await this.logBlockchainAction(
        'invokeSmartContract',
        { contractAddress, method, args },
        null,
        err,
      );
      throw new Error('Soroban contract invocation failed.');
    }
  }

  /**
   * Soroban contract invocation via CLI (optional fallback)
   */
  async invokeViaCli(contractId: string, method: string, args: string[]): Promise<string> {
    const command = `soroban contract invoke \
      --network futurenet \
      --id ${contractId} \
      --fn ${method} \
      ${args.map((arg) => `--arg ${arg}`).join(' ')}`;

    return new Promise((resolve, reject) => {
      exec(command, async (err, stdout, stderr) => {
        if (err) {
          this.logger.error(`Soroban CLI error: ${stderr}`);
          await this.logBlockchainAction(
            'invokeViaCli',
            { contractId, method, args },
            null,
            stderr,
          );
          return reject(stderr);
        }

        this.logger.log(`Soroban CLI success: ${stdout}`);
        await this.logBlockchainAction('invokeViaCli', { contractId, method, args }, stdout);
        resolve(stdout);
      });
    });
  }

  /**
   * Log any blockchain operation (can be extended to DB or file-based)
   */
  async logBlockchainAction(action: string, payload: any, result: any, error?: any): Promise<void> {
    this.logger.log({
      action,
      method: payload?.method,
      contract: payload?.contractAddress,
      args: payload?.args,
      result,
      error: error?.message || error || null,
    });

    // Optionally store to DB
  }
}
