/**
 * Result of a wallet connection attempt.
 */
export interface WalletConnectionResult {
    /** Wallet entity or DTO */
    wallet: any;
    /** JWT access token for the session */
    accessToken: string;
    /** Whether this is a new wallet */
    isNewWallet: boolean;
}

/**
 * Result of a credential sharing operation.
 */
export interface CredentialShareResult {
    /** Whether the sharing was successful */
    success: boolean;
    /** Blockchain transaction hash (if applicable) */
    transactionHash?: string;
    /** List of shared credential IDs */
    sharedCredentials: string[];
    /** Any errors encountered */
    errors?: string[];
}

/**
 * Interface for wallet provider implementations.
 */
export interface WalletProvider {
    /** Verify a wallet signature */
    verifySignature(address: string, message: string, signature: string): Promise<boolean>;
    /** Generate a random nonce for authentication */
    generateNonce(): string;
    /** Format a message for signing */
    formatMessage(nonce: string, address: string): string;
}