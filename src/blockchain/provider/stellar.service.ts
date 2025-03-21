import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import * as StellarSdk from "stellar-sdk"

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name)
  private server: StellarSdk.Server
  private networkPassphrase: string
  private adminKeypair: StellarSdk.Keypair

  constructor(private configService: ConfigService) {
    // Initialize Stellar SDK
    const network = this.configService.get<string>("stellar.network")
    const serverUrl = this.configService.get<string>("stellar.serverUrl")

    this.server = new StellarSdk.Server(serverUrl)
    this.networkPassphrase = network === "testnet" ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC

    // Load admin keypair if secret key is provided
    const adminSecretKey = this.configService.get<string>("stellar.adminSecretKey")
    if (adminSecretKey) {
      this.adminKeypair = StellarSdk.Keypair.fromSecret(adminSecretKey)
    }
  }

  /**
   * Get account details from the Stellar network
   */
  async getAccount(publicKey: string): Promise<any> {
    try {
      const account = await this.server.loadAccount(publicKey)
      return account
    } catch (error) {
      this.logger.error(`Error getting account ${publicKey}: ${error.message}`)
      throw error
    }
  }

  /**
   * Create a new account on the Stellar network
   */
  async createAccount(destinationPublicKey: string): Promise<any> {
    try {
      if (!this.adminKeypair) {
        throw new Error("Admin keypair not configured")
      }

      // Load admin account
      const adminAccount = await this.server.loadAccount(this.adminKeypair.publicKey())

      // Build the transaction
      const transaction = new StellarSdk.TransactionBuilder(adminAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.createAccount({
            destination: destinationPublicKey,
            startingBalance: "2", // Minimum balance for a new account
          }),
        )
        .setTimeout(30)
        .build()

      // Sign the transaction
      transaction.sign(this.adminKeypair)

      // Submit the transaction
      const result = await this.server.submitTransaction(transaction)
      return result
    } catch (error) {
      this.logger.error(`Error creating account: ${error.message}`)
      throw error
    }
  }

  /**
   * Send XLM payment on the Stellar network
   */
  async sendPayment(
    sourceKeypair: StellarSdk.Keypair,
    destinationPublicKey: string,
    amount: string,
    memo?: string,
  ): Promise<any> {
    try {
      // Load source account
      const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey())

      // Build the transaction
      let transactionBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destinationPublicKey,
            asset: StellarSdk.Asset.native(), // XLM
            amount: amount,
          }),
        )
        .setTimeout(30)

      // Add memo if provided
      if (memo) {
        transactionBuilder = transactionBuilder.addMemo(StellarSdk.Memo.text(memo))
      }

      const transaction = transactionBuilder.build()

      // Sign the transaction
      transaction.sign(sourceKeypair)

      // Submit the transaction
      const result = await this.server.submitTransaction(transaction)
      return result
    } catch (error) {
      this.logger.error(`Error sending payment: ${error.message}`)
      throw error
    }
  }

  /**
   * Create a Stellar smart contract (using Soroban)
   */
  async deploySorobanContract(sourceKeypair: StellarSdk.Keypair, wasmId: string): Promise<any> {
    try {
      // Load source account
      const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey())

      // Build the transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.createSorobanContract({
            wasmId: wasmId,
          }),
        )
        .setTimeout(30)
        .build()

      // Sign the transaction
      transaction.sign(sourceKeypair)

      // Submit the transaction
      const result = await this.server.submitTransaction(transaction)
      return result
    } catch (error) {
      this.logger.error(`Error deploying Soroban contract: ${error.message}`)
      throw error
    }
  }

  /**
   * Invoke a Soroban contract function
   */
  async invokeSorobanContract(
    sourceKeypair: StellarSdk.Keypair,
    contractId: string,
    functionName: string,
    args: any[],
  ): Promise<any> {
    try {
      // Load source account
      const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey())

      // Build the transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.invokeSorobanContract({
            contractId: contractId,
            functionName: functionName,
            args: args,
          }),
        )
        .setTimeout(30)
        .build()

      // Sign the transaction
      transaction.sign(sourceKeypair)

      // Submit the transaction
      const result = await this.server.submitTransaction(transaction)
      return result
    } catch (error) {
      this.logger.error(`Error invoking Soroban contract: ${error.message}`)
      throw error
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionHash: string): Promise<any> {
    try {
      const transaction = await this.server.transactions().transaction(transactionHash).call()
      return transaction
    } catch (error) {
      this.logger.error(`Error getting transaction ${transactionHash}: ${error.message}`)
      throw error
    }
  }

  /**
   * Get transaction operations
   */
  async getTransactionOperations(transactionHash: string): Promise<any> {
    try {
      const operations = await this.server.operations().forTransaction(transactionHash).call()
      return operations
    } catch (error) {
      this.logger.error(`Error getting operations for transaction ${transactionHash}: ${error.message}`)
      throw error
    }
  }

  /**
   * Generate a new Stellar keypair
   */
  generateKeypair(): { publicKey: string; secretKey: string } {
    const keypair = StellarSdk.Keypair.random()
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    }
  }

  /**
   * Check if an account exists on the Stellar network
   */
  async accountExists(publicKey: string): Promise<boolean> {
    try {
      await this.server.loadAccount(publicKey)
      return true
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false
      }
      throw error
    }
  }
}