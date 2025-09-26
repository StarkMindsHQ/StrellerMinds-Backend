import { registerAs } from '@nestjs/config';

export interface StellarNetworkConfig {
  horizonUrl: string;
  networkPassphrase: string;
}

export interface StellarConfig {
  networks: {
    mainnet: StellarNetworkConfig;
    testnet: StellarNetworkConfig;
  };
  defaultNetwork: 'mainnet' | 'testnet';
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export default registerAs(
  'stellar',
  (): StellarConfig => ({
    networks: {
      mainnet: {
        horizonUrl: process.env.STELLAR_MAINNET_HORIZON_URL || 'https://horizon.stellar.org',
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      },
      testnet: {
        horizonUrl:
          process.env.STELLAR_TESTNET_HORIZON_URL || 'https://horizon-testnet.stellar.org',
        networkPassphrase: 'Test SDF Network ; September 2015',
      },
    },
    defaultNetwork: (process.env.STELLAR_DEFAULT_NETWORK as 'mainnet' | 'testnet') || 'testnet',
    timeout: parseInt(process.env.STELLAR_TIMEOUT) || 30000, // 30 seconds
    retryAttempts: parseInt(process.env.STELLAR_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.STELLAR_RETRY_DELAY) || 1000, // 1 second
  }),
);
