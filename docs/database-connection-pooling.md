# Database Connection Pooling Configuration

## Overview

To improve database performance and reliability, we've implemented connection pooling, optimized pool settings, added monitoring, and a retry mechanism for transient failures.

## Pooling Options

We use PostgreSQL's built-in pooling via TypeORM configuration, leveraging the `pg` driver's `extra` options.

## Configuration Approach

1. **Environment Variables**: Defined in `.env` files and `.env.example`:

   ```dotenv
   DATABASE_POOL_MAX=10         # Maximum connections in pool
   DATABASE_POOL_MIN=1          # Minimum connections in pool
   DATABASE_IDLE_TIMEOUT=30000  # Milliseconds before idle connection is closed

   DATABASE_RETRY_ATTEMPTS=5    # Number of retry attempts for transient errors
   DATABASE_RETRY_DELAY=3000    # Milliseconds between retry attempts
   ```

2. **database.config.ts**: Loaded via `ConfigModule`:

   ```typescript
   export default registerAs('database', () => ({
     // existing config...
     maxPoolSize: parseInt(process.env.DATABASE_POOL_MAX) || 10,
     minPoolSize: parseInt(process.env.DATABASE_POOL_MIN) || 1,
     poolIdleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
     retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS) || 5,
     retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY) || 3000,
   }));
   ```

3. **TypeOrmModule Configuration**:
   ```typescript
   TypeOrmModule.forRootAsync({
     useFactory: (configService: ConfigService) => ({
       type: 'postgres',
       // ...other config
       extra: {
         max: configService.get<number>('database.maxPoolSize'),
         min: configService.get<number>('database.minPoolSize'),
         idleTimeoutMillis: configService.get<number>('database.poolIdleTimeout'),
       },
       retryAttempts: configService.get<number>('database.retryAttempts'),
       retryDelay: configService.get<number>('database.retryDelay'),
     }),
   }),
   ```

## Connection Monitoring

Added a health endpoint `/health/db` in `HealthController`:

```typescript
@Get('db')
async checkDatabase() {
  return this.healthService.checkDatabase();
}
```

Where `HealthService` performs:

```typescript
await this.dataSource.query('SELECT 1');
```

## Retry Mechanism & Error Handling

- **Retries**: Configured via TypeORM's `retryAttempts` and `retryDelay` for transient failures.
- **Error Handling**: If connection fails, health endpoint returns `database: 'disconnected'`.

## Testing

Added DB health check tests in `health.e2e-spec.ts`:

```typescript
describe('/health/db (GET)', () => {
  it('should return database status', async () => {
    const res = await request(app.getHttpServer()).get('/health/db');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
  });
});
```

## Summary

- Configured pooling: max/min connections, idle timeout.
- Implemented retry on transient DB errors.
- Added monitoring endpoint.
- Updated documentation and tests.
