import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from 'stellar-sdk';

@Injectable()
export class StellarService {
  private readonly server: any;
  private readonly sourceKeypair: StellarSdk.Keypair;
  private readonly logger = new Logger(StellarService.name);

  constructor(private configService: ConfigService) {
    const network = this.configService.get('STELLAR_NETWORK', 'testnet');
    const serverUrl = network === 'testnet' 
      ? 'https://horizon-testnet.stellar.org' 
      : 'https://horizon.stellar.org';
    
    this.server = new StellarSdk.Horizon.Server(serverUrl);
    
    const sourceSecretKey = this.configService.get<string>('STELLAR_SECRET_KEY');
    if (!sourceSecretKey) {
      throw new Error('STELLAR_SECRET_KEY is required');
    }
    this.sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
  }

  async processPayment(destinationPublicKey: string, amount: number): Promise<string> {
    try {
      const sourceAccount = await this.server.loadAccount(this.sourceKeypair.publicKey());

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: await this.server.fetchBaseFee(),
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destinationPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(this.sourceKeypair);

      const result = await this.server.submitTransaction(transaction);
      
      return result.hash;
    } catch (error) {
      this.logger.error('Error processing Stellar payment:', error);
      throw error;
    }
  }

  async verifyPayment(transactionHash: string): Promise<boolean> {
    try {
      const transaction = await this.server.transactions().transaction(transactionHash).call();
      return transaction.successful;
    } catch (error) {
      this.logger.error('Error verifying Stellar payment:', error);
      return false;
    }
  }
}
