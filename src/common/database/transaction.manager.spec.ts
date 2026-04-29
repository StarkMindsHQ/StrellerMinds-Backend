import { EntityManager } from 'typeorm';
import { TransactionManager } from './transaction.manager';

describe('TransactionManager', () => {
  let fakeDataSource: {
    transaction: jest.Mock<Promise<unknown>, [(em: EntityManager) => Promise<unknown>]>;
  };
  let transactionManager: TransactionManager;
  let committedOperations: string[];
  let rolledBackOperations: string[];

  beforeEach(() => {
    committedOperations = [];
    rolledBackOperations = [];

    fakeDataSource = {
      transaction: jest.fn(async (work) => {
        const manager = {
          save: jest.fn(async (entity: { description: string }) => {
            committedOperations.push(entity.description);
            return entity;
          }),
        } as unknown as EntityManager;

        try {
          return await work(manager);
        } catch (error) {
          rolledBackOperations = [...committedOperations];
          committedOperations = [];
          throw error;
        }
      }),
    };

    transactionManager = new TransactionManager(fakeDataSource as any);
  });

  it('delegates work to DataSource.transaction and returns the result', async () => {
    const result = await transactionManager.run(async (em) => {
      await em.save({ description: 'save-success' } as any);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(fakeDataSource.transaction).toHaveBeenCalledTimes(1);
    expect(committedOperations).toEqual(['save-success']);
    expect(rolledBackOperations).toEqual([]);
  });

  it('propagates errors and rolls back changes when work throws', async () => {
    await expect(
      transactionManager.run(async (em) => {
        await em.save({ description: 'save-fail' } as any);
        throw new Error('simulated transaction failure');
      }),
    ).rejects.toThrow('simulated transaction failure');

    expect(fakeDataSource.transaction).toHaveBeenCalledTimes(1);
    expect(committedOperations).toEqual([]);
    expect(rolledBackOperations).toEqual(['save-fail']);
  });
});
