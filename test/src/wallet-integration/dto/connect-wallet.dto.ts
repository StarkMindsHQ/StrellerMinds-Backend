import { IsEnum, IsString, IsOptional, IsEthereumAddress } from 'class-validator';
import { WalletType } from '../entities/wallet.entity';

export class ConnectWalletDto {
  @IsEthereumAddress()
  address: string;

  @IsEnum(WalletType)
  type: WalletType;

  @IsString()
  signature: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  ensName?: string;
}
