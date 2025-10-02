/**
 * WalletModule provides blockchain wallet integration, authentication, and credential sharing features.
 *
 * @module WalletIntegration
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { Wallet } from './entities/wallet.entity';
import { Credential } from './entities/credential.entity';
import { EthereumWalletProvider } from './providers/ethereum-wallet.provider';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Credential]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [WalletController],
  providers: [WalletService, EthereumWalletProvider, JwtStrategy],
  exports: [WalletService],
})
export class WalletModule {}
