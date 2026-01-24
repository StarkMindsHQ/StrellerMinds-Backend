import { IsString, IsNotEmpty, IsOptional, IsDateString, IsObject } from 'class-validator';

export class LtiConfigDto {
  @IsString()
  @IsNotEmpty()
  platformUrl: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @IsString()
  @IsNotEmpty()
  kid: string;

  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @IsString()
  @IsOptional()
  privateKey?: string;

  @IsString()
  @IsOptional()
  deploymentId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class LtiLaunchDto {
  @IsString()
  @IsNotEmpty()
  id_token: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  scope?: string;
}

export class LtiContextDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsString()
  title: string;

  @IsObject()
  custom?: Record<string, any>;
}

export class LtiUserDto {
  @IsString()
  sub: string;

  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  given_name?: string;

  @IsString()
  @IsOptional()
  family_name?: string;

  @IsString()
  @IsOptional()
  picture?: string;
}

export class LtiGradeDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  lineItemId: string;

  @IsString()
  @IsNotEmpty()
  scoreGiven: number;

  @IsString()
  @IsNotEmpty()
  scoreMaximum: number;

  @IsString()
  @IsOptional()
  activityProgress?: string;

  @IsString()
  @IsOptional()
  gradingProgress?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
