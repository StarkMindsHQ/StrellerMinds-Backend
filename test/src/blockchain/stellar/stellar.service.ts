import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Server,
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
} from 'stellar-sdk';
import axios from 'axios';
import { exec } from 'child_process';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly server = new Server('https://horizon-testnet.stellar.org');
  private readonly networkPassphrase = Networks.TESTNET;

  /**
   * Create a trustline to a custom asset
   */
  async createTrustline(sourceSecret: string, assetCode: string, issuer: string) {
    try {
      const sourceKeypair = Keypair.fromSecret(sourceSecret);
      const account = await this.server.loadAccount(sourceKeypair.publicKey());

      const asset = new Asset(assetCode, issuer);

      const tx = new TransactionBuilder(account, {
        fee: await this.server.fetchBaseFee(),
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
    } catch (err) {
      this.logger.error('Error creating trustline', err?.response?.data || err);
      await this.logBlockchainAction('createTrustline', { assetCode, issuer }, null, err);
      throw new Error(`Blockchain error: ${err.response?.data?.extras?.result_codes?.operations || err.message}`);
    }
  }

  /**
   * Monitor a transaction by hash (polling)
   */
  async monitorTransaction(txHash: string): Promise<any> {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      this.logger.log(`Transaction ${txHash} confirmed: ${tx.ledger}`);
      return tx;
    } catch (err) {
      this.logger.warn(`Transaction ${txHash} not yet confirmed or not found.`);
      return null;
    }
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

      await this.logBlockchainAction('invokeSmartContract', { contractAddress, method, args }, data);

      return data;
    } catch (err) {
      this.logger.error(`Soroban RPC failed: ${method}`, err?.response?.data || err);
      await this.logBlockchainAction('invokeSmartContract', { contractAddress, method, args }, null, err);
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
      ${args.map(arg => `--arg ${arg}`).join(' ')}`;

    return new Promise((resolve, reject) => {
      exec(command, async (err, stdout, stderr) => {
        if (err) {
          this.logger.error(`Soroban CLI error: ${stderr}`);
          await this.logBlockchainAction('invokeViaCli', { contractId, method, args }, null, stderr);
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
  async logBlockchainAction(
    action: string,
    payload: any,
    result: any,
    error?: any,
  ) {
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
