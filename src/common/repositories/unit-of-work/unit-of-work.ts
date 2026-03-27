import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { IUnitOfWork } from '../interfaces/repository.interface';

@Injectable()
export class UnitOfWork implements IUnitOfWork {
  private transactionManager: EntityManager | null = null;

  constructor(private readonly dataSource: DataSource) {}

  async begin(): Promise<void> {
    if (this.isTransactionActive()) {
      throw new Error('Transaction is already active');
    }
    
    this.transactionManager = this.dataSource.createQueryRunner();
    await this.transactionManager.connect();
    await this.transactionManager.startTransaction();
  }

  async commit(): Promise<void> {
    if (!this.transactionManager) {
      throw new Error('No active transaction to commit');
    }

    try {
      await this.transactionManager.commitTransaction();
    } finally {
      await this.releaseTransaction();
    }
  }

  async rollback(): Promise<void> {
    if (!this.transactionManager) {
      throw new Error('No active transaction to rollback');
    }

    try {
      await this.transactionManager.rollbackTransaction();
    } finally {
      await this.releaseTransaction();
    }
  }

  isTransactionActive(): boolean {
    return this.transactionManager?.isTransactionActive ?? false;
  }

  getManager(): EntityManager {
    if (!this.transactionManager) {
      throw new Error('No active transaction. Call begin() first.');
    }
    return this.transactionManager;
  }

  private async releaseTransaction(): Promise<void> {
    if (this.transactionManager) {
      await this.transactionManager.release();
      this.transactionManager = null;
    }
  }

  async withTransaction<T>(operation: (manager: EntityManager) => Promise<T>): Promise<T> {
    await this.begin();
    try {
      const result = await operation(this.getManager());
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}
