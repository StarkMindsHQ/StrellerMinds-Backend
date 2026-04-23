import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Execute a simple query to verify database connectivity
      await this.userRepository.query('SELECT 1');
      return this.getStatus(key, true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database connection failed';
      throw new HealthCheckError(
        'DatabaseCheck failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
