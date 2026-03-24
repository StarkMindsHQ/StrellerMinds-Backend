import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ITransactionManager } from '../interfaces/service.interface';

/**
 * Transaction manager for handling database transactions
 */
@Injectable()
export class TransactionManager implements ITransactionManager {
  private readonly logger = new Logger(TransactionManager.name);

  constructor(private readonly dataSource: DataSource) {}

  async executeInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation();
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction rolled back due to error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async beginTransaction(): Promise<void> {
    throw new Error('Use executeInTransaction for automatic transaction management');
  }

  async commit(): Promise<void> {
    throw new Error('Use executeInTransaction for automatic transaction management');
  }

  async rollback(): Promise<void> {
    throw new Error('Use executeInTransaction for automatic transaction management');
  }
}
