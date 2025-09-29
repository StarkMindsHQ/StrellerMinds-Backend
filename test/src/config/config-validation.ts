import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';

export class DatabaseConfigDto {
  @IsString()
  host?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  port?: number;

  @IsString()
  username?: string;

  @IsString()
  password?: string;

  @IsString()
  database?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ssl?: boolean;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxConnections?: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  timeout?: number;
}

export class RedisConfigDto {
  @IsString()
  host?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  port?: number;

  @IsOptional()
  @IsString()
  password?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  db?: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxRetries?: number;
}

export class CorsConfigDto {
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  enabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  origins?: string[];
}

export class RateLimitConfigDto {
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  windowMs?: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxRequests?: number;
}

export class ServerConfigDto {
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  port?: number;

  @IsString()
  host?: string;

  @ValidateNested()
  @Type(() => CorsConfigDto)
  cors?: CorsConfigDto;

  @ValidateNested()
  @Type(() => RateLimitConfigDto)
  rateLimit?: RateLimitConfigDto;
}

export class LogFileConfigDto {
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  enabled?: boolean;

  @IsString()
  path?: string;

  @IsString()
  maxSize?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxFiles?: number;
}

export class LoggingConfigDto {
  @IsEnum(['debug', 'info', 'warn', 'error'])
  level?: 'debug' | 'info' | 'warn' | 'error';

  @IsEnum(['json', 'text'])
  format?: 'json' | 'text';

  @IsOptional()
  @ValidateNested()
  @Type(() => LogFileConfigDto)
  file?: LogFileConfigDto;
}

export class AppInfoDto {
  @IsString()
  name?: string;

  @IsString()
  version?: string;

  @IsEnum(['development', 'staging', 'production'])
  environment?: 'development' | 'staging' | 'production';
}

export class EnvironmentVariables {
  @ValidateNested()
  @Type(() => AppInfoDto)
  app?: AppInfoDto;

  @ValidateNested()
  @Type(() => ServerConfigDto)
  server?: ServerConfigDto;

  @ValidateNested()
  @Type(() => DatabaseConfigDto)
  database?: DatabaseConfigDto;

  @ValidateNested()
  @Type(() => RedisConfigDto)
  redis?: RedisConfigDto;

  @ValidateNested()
  @Type(() => LoggingConfigDto)
  logging?: LoggingConfigDto;

  @IsObject()
  features?: { [key: string]: boolean };
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  return validatedConfig;
}
