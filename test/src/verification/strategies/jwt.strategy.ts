// src/verification/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtStrategy {
  async verify(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      return {
        verified: true,
        payload: decoded,
      };
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }
}