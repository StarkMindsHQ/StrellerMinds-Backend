export interface ICredential {
    id: string;
    userId: string;
    type: string;
    name: string;
    metadata: Record<string, any>;
    issuerId: string;
    issuerName: string;
    issuedAt: Date;
    expiresAt?: Date;
    status: string;
    txHash: string;
    network: string;
    blockHeight: number;
    verificationStatus: boolean;
    updatedAt: Date;
  }