import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * A thin wrapper around TypeORM's DataSource that makes it easy to run
 * multiple repository operations inside a single atomic database transaction.
 *
 * Usage:
 *   await this.transactionManager.run(async (em) => {
 *     await em.save(UserEntity, user);
 *     await em.save(UserProfile, profile);
 *     await em.save(SecurityAudit, audit);
 *   });
 */
@Injectable()
export class TransactionManager {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Execute `work` inside a database transaction.
   * If `work` throws, the transaction is rolled back automatically.
   *
   * @param work  An async callback that receives a transactional EntityManager.
   * @returns     Whatever `work` resolves with.
   */
  async run<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }
}
