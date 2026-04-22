import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

@Injectable()
export class ConnectionPoolManager {
  private readonly logger = new Logger(ConnectionPoolManager.name);
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async executeWithCircuitBreaker<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    if (this.circuitState === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.circuitState = CircuitState.HALF_OPEN;
        this.logger.log('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - database connections unavailable');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      const result = await operation(queryRunner);
      
      if (this.circuitState === CircuitState.HALF_OPEN) {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime.getTime() >= this.resetTimeout;
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = CircuitState.OPEN;
      this.logger.error(
        `Circuit breaker opened after ${this.failureCount} failures`,
      );
    }
  }

  private reset() {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.logger.log('Circuit breaker reset to CLOSED state');
  }

  getCircuitState(): CircuitState {
    return this.circuitState;
  }
}
