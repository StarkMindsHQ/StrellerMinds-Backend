// src/verification/strategies/eth-signature.strategy.ts
import { Injectable } from '@nestjs/common';
import { verifyMessage } from 'ethers';

@Injectable()
export class EthSignatureStrategy {
  async verify(signature: string): Promise<any> {
    const message = 'Verify credential ownership';
    const address = '0xYourExpectedAddress';

    try {
      const recoveredAddress = verifyMessage(message, signature);
      const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();

      return {
        verified: isValid,
        recoveredAddress,
      };
    } catch (error) {
      throw new Error('Invalid Ethereum signature');
    }
  }
}