import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateUserSettingDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsIn(['en', 'fr', 'es'])
  language?: string;

  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}
