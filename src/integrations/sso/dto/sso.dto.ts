import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum SSOProvider {
  OPENID = 'openid',
  SAML = 'saml',
  OAUTH2 = 'oauth2',
  LDAP = 'ldap',
}

export class SSOConfigDto {
  @IsEnum(SSOProvider)
  @IsNotEmpty()
  provider: SSOProvider;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientSecret?: string;

  @IsString()
  @IsOptional()
  discoveryUrl?: string;

  @IsString()
  @IsOptional()
  authorizationUrl?: string;

  @IsString()
  @IsOptional()
  tokenUrl?: string;

  @IsString()
  @IsOptional()
  userInfoUrl?: string;

  @IsArray()
  @IsOptional()
  scopes?: string[];

  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @IsString()
  @IsOptional()
  issuer?: string;

  @IsString()
  @IsOptional()
  idpUrl?: string;

  @IsString()
  @IsOptional()
  ldapUrl?: string;

  @IsString()
  @IsOptional()
  ldapBaseDn?: string;
}

export class SSOTokenDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsOptional()
  idToken?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  expiresIn?: string;

  @IsString()
  @IsOptional()
  tokenType?: string;
}

export class SSOUserDto {
  @IsString()
  @IsNotEmpty()
  sub: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  given_name?: string;

  @IsString()
  @IsOptional()
  family_name?: string;

  @IsString()
  @IsOptional()
  picture?: string;

  @IsArray()
  @IsOptional()
  groups?: string[];

  @IsArray()
  @IsOptional()
  roles?: string[];
}
