// src/guards/api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKey } from '../course/entities/api-key.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) throw new UnauthorizedException('API key missing');

    const repo = this.dataSource.getRepository(ApiKey);
    const key = await repo.findOne({ where: { key: apiKey, active: true } });

    if (!key) throw new UnauthorizedException('Invalid API key');
    return true;
  }
}