import { IsString, Length } from 'class-validator';

export class MfaTokenDto {
  @IsString()
  @Length(6, 6)
  token: string;
}
