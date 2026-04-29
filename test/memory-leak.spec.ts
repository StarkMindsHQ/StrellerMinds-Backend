import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MemoryLeakDetector } from './utils/memory-leak-detector';
import { ConnectionPoolMonitor } from '../src/database/connection-pool.monitor';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getDataSourceToken } from '@nestjs/typeorm';

describe('Memory Leak Tests', () => {
  let app: INestApplication;
  let detector: MemoryLeakDetector;

  const mockDataSource = {
    driver: {
      pool: {
        totalCount: 10,
        idleCount: 5,
        waitingCount: 0,
      },
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionPoolMonitor,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    detector = new MemoryLeakDetector();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should not leak memory during repeated monitor checks', async () => {
    const iterations = 1000;
    const monitor = app.get(ConnectionPoolMonitor);
    
    console.log('--- Memory Leak Test: ConnectionPoolMonitor ---');
    
    detector.setBaseline();
    const baseline = detector.check();
    console.log(`Baseline: ${MemoryLeakDetector.toMB(baseline.baseline)}`);

    for (let i = 0; i < iterations; i++) {
      await monitor.getPoolStats();
      await monitor.checkPoolHealth();
      
      if (i % 200 === 0) {
        const stats = detector.takeSnapshot();
        console.log(`Iteration ${i}: ${MemoryLeakDetector.toMB(stats.heapUsed)}`);
      }
    }

    detector.triggerGC();
    const result = detector.check(0.10); // Allow 10% growth
    console.log(`Final: ${MemoryLeakDetector.toMB(result.current)}`);
    console.log(`Growth: ${(result.growth * 100).toFixed(2)}%`);

    expect(result.leaking).toBe(false);
  }, 60000);

  it('should not leak memory when creating and destroying many testing modules', async () => {
    console.log('--- Memory Leak Test: Module Churn ---');
    
    detector.setBaseline();
    const baseline = detector.check();
    console.log(`Baseline: ${MemoryLeakDetector.toMB(baseline.baseline)}`);

    for (let i = 0; i < 20; i++) {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          ConnectionPoolMonitor,
          { provide: getDataSourceToken(), useValue: mockDataSource },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      const tempApp = moduleFixture.createNestApplication();
      await tempApp.init();
      await tempApp.close();
      
      if (i % 5 === 0) {
        const stats = detector.takeSnapshot();
        console.log(`Re-init ${i}: ${MemoryLeakDetector.toMB(stats.heapUsed)}`);
      }
    }

    detector.triggerGC();
    const result = detector.check(0.15); // Allow 15% growth
    console.log(`Final: ${MemoryLeakDetector.toMB(result.current)}`);
    console.log(`Growth: ${(result.growth * 100).toFixed(2)}%`);

    expect(result.leaking).toBe(false);
  }, 120000);
});
