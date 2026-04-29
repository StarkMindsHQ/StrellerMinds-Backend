# Chaos Engineering Test Suite

This suite provides a framework and set of tests to verify the resilience of the StrellerMinds Backend against various failure scenarios, such as database outages, network latency, and service disruptions.

## Key Components

### 1. Chaos Helpers (`test/chaos/chaos-helpers.ts`)
A utility library for fault injection and resilience monitoring:
- **`FaultInjector`**: Patches `DataSource` and other components to inject:
  - Query failures/timeouts
  - Artificial latency
  - Connection failures
  - Random packet loss simulation
- **`ResilienceMetrics`**: Tracks success rates, latencies (avg/p99), and recovery times.
- **`ChaosScheduler`**: Allows scheduling complex failure windows (e.g., "fail for 30s then recover").

### 2. Test Scenarios
- **Database Failures** (`test/chaos/database-failure.chaos.spec.ts`):
  - Validates Circuit Breaker transitions (Closed -> Open -> Half-Open).
  - Verifies system behavior during complete DB outages and transient "blips".
  - Checks pool saturation monitoring and health events.
- **Network Issues** (`test/chaos/network-issues.chaos.spec.ts`):
  - Simulates Stellar RPC timeouts and DNS failures.
  - Verifies degraded health status when partial network loss occurs.
  - Measures system response to network "flapping".
- **Service Resilience** (`test/chaos/service-resilience.chaos.spec.ts`):
  - Verifies "Blast Radius" isolation: ensures a DB failure doesn't crash non-DB services.
  - Tests `CourseService` and `HealthService` graceful degradation.
  - Validates `DynamicPoolSizingService` logic under extreme conditions.

## Running the Tests

New scripts have been added to `package.json`:

```bash
# Run all chaos tests once
npm run test:chaos

# Run chaos tests in watch mode
npm run test:chaos:watch
```

> [!NOTE]
> These tests use mocks and do not require a live database or network connection, making them safe for CI/CD pipelines.

> [!WARNING]
> If you encounter memory or disk space issues (e.g., `ENOSPC`), ensure your environment has sufficient resources. The tests are designed to be lightweight but the NestJS/Jest environment itself requires some baseline memory.
