import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { WalletProvider } from '../interfaces/wallet-service.interface';

@Injectable()
export class EthereumWalletProvider implements WalletProvider {
  async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  formatMessage(nonce: string, address: string): string {
    return `Sign this message to authenticate with your wallet.\n\nNonce: ${nonce}\nAddress: ${address}\nTimestamp: ${new Date().toISOString()}`;
  }
}
