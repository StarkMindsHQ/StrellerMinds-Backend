import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConnectionPoolMonitor } from '../src/database/connection-pool.monitor';
import { AppModule } from '../src/app.module';

describe('Connection Pool Load Test', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let poolMonitor: ConnectionPoolMonitor;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    poolMonitor = app.get(ConnectionPoolMonitor);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle concurrent connections without exhaustion', async () => {
    const concurrentRequests = 50;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        dataSource.query('SELECT pg_sleep(0.1), $1 as request_id', [i])
      );
    }

    const startStats = await poolMonitor.getPoolStats();
    console.log('Start stats:', startStats);

    await Promise.all(promises);

    const endStats = await poolMonitor.getPoolStats();
    console.log('End stats:', endStats);

    expect(endStats.waitingRequests).toBeLessThan(10);
    expect(endStats.utilizationPercent).toBeLessThan(100);
  }, 30000);

  it('should maintain pool health under sustained load', async () => {
    const duration = 10000; // 10 seconds
    const requestsPerSecond = 10;
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      const batch = Array(requestsPerSecond)
        .fill(null)
        .map(() => dataSource.query('SELECT 1'));
      
      await Promise.all(batch);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const health = await poolMonitor.checkPoolHealth();
    expect(health.healthy).toBe(true);
  }, 15000);

  it('should recover from connection spikes', async () => {
    // Create spike
    const spike = Array(100)
      .fill(null)
      .map(() => dataSource.query('SELECT pg_sleep(0.05)'));

    await Promise.all(spike);

    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 2000));

    const stats = await poolMonitor.getPoolStats();
    expect(stats.idleConnections).toBeGreaterThan(0);
    expect(stats.waitingRequests).toBe(0);
  }, 20000);

  it('should track utilization metrics accurately', async () => {
    await dataSource.query('SELECT 1');
    
    const avgUtilization = poolMonitor.getAverageUtilization(1);
    expect(avgUtilization).toBeGreaterThanOrEqual(0);
    expect(avgUtilization).toBeLessThanOrEqual(100);
  });
});
