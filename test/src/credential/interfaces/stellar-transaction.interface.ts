export interface StellarTransaction {
    id: string;
    hash: string;
    ledger: number;
    createdAt: string;
    sourceAccount: string;
    memo?: string;
    memoType?: string;
    successful: boolean;
    envelope: any;
    resultXdr: string;
    resultMetaXdr: string;
  }