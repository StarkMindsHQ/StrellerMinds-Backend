# Connection Pooling Quick Start

## 1. Configure Environment Variables

Add to your `.env` file:

```bash
# Basic Configuration (Development)
DATABASE_POOL_MAX=5
DATABASE_POOL_MIN=1
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=10000

# Production Configuration
# DATABASE_POOL_MAX=20
# DATABASE_POOL_MIN=5
# DATABASE_IDLE_TIMEOUT=30000
# DATABASE_CONNECTION_TIMEOUT=10000
# DATABASE_ACQUIRE_TIMEOUT=60000
```

## 2. Start the Application

```bash
npm run start:dev
```

Connection pooling is automatically enabled!

## 3. Verify It's Working

Check pool health:
```bash
curl http://localhost:3000/database/pool/health
```

Expected response:
```json
{
  "healthy": true,
  "stats": {
    "totalConnections": 5,
    "activeConnections": 1,
    "idleConnections": 4,
    "waitingRequests": 0,
    "utilizationPercent": 20,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 4. Monitor Pool Usage

Get current stats:
```bash
curl http://localhost:3000/database/pool/stats
```

Get average utilization:
```bash
curl http://localhost:3000/database/pool/utilization?minutes=5
```

## 5. Run Load Tests (Optional)

```bash
npm run test -- connection-pool.load.spec.ts
```

## That's It!

Your database now has:
- ✅ Connection pooling enabled
- ✅ Automatic monitoring
- ✅ Circuit breaker protection
- ✅ Health check endpoints

## Troubleshooting

### Pool exhaustion warnings?
Increase `DATABASE_POOL_MAX` in `.env`

### Too many idle connections?
Decrease `DATABASE_POOL_MIN` in `.env`

### Need more details?
See [CONNECTION_POOLING_README.md](./docs/CONNECTION_POOLING_README.md)

## Monitoring Endpoints

- Health: `GET /database/pool/health`
- Stats: `GET /database/pool/stats`
- History: `GET /database/pool/stats/recent?count=10`
- Utilization: `GET /database/pool/utilization?minutes=5`
- Circuit Breaker: `GET /database/pool/circuit-breaker`

## Recommended Settings

| Environment | MAX | MIN |
|-------------|-----|-----|
| Development | 5   | 1   |
| Staging     | 15  | 2   |
| Production  | 20  | 5   |
| High-Load   | 50  | 10  |

## Support

Questions? Check the docs:
- [Complete Guide](./docs/CONNECTION_POOLING_README.md)
- [Configuration Reference](./docs/DATABASE_CONNECTION_POOLING.md)
