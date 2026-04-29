# Database Connection Pooling Configuration

## Environment Variables

### Core Pool Settings

```bash
# Maximum number of connections in the pool
# Production: 20-50, Development: 5-10
DATABASE_POOL_MAX=20

# Minimum number of connections to maintain
# Production: 2-5, Development: 1-2
DATABASE_POOL_MIN=2

# Time (ms) a connection can remain idle before being closed
DATABASE_IDLE_TIMEOUT=30000

# Time (ms) to wait for a connection before timing out
DATABASE_CONNECTION_TIMEOUT=10000

# Time (ms) to wait when acquiring a connection from the pool
DATABASE_ACQUIRE_TIMEOUT=60000

# Time (ms) to wait when creating a new connection
DATABASE_CREATE_TIMEOUT=30000

# Time (ms) to wait when destroying a connection
DATABASE_DESTROY_TIMEOUT=5000

# Interval (ms) to check for idle connections to reap
DATABASE_REAP_INTERVAL=1000

# Interval (ms) between connection creation retries
DATABASE_CREATE_RETRY_INTERVAL=200

# Maximum number of times a connection can be reused
DATABASE_CONNECTION_MAX_USES=10000

# Enable connection validation before use
DATABASE_VALIDATE_CONNECTIONS=true

# Run connection setup on connect
DATABASE_RUN_ON_CONNECT=true
```

### Query Timeouts

```bash
# Maximum time (ms) for a statement to execute
DATABASE_STATEMENT_TIMEOUT=30000

# Maximum time (ms) for a query to execute
DATABASE_QUERY_TIMEOUT=30000
```

### SSL Configuration (Production)

```bash
# Enable SSL for database connections
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# Path to SSL certificate
DATABASE_SSL_CERT=/path/to/cert.pem

# Path to SSL key
DATABASE_SSL_KEY=/path/to/key.pem

# Path to SSL CA certificate
DATABASE_SSL_CA=/path/to/ca.pem
```

### Monitoring

```bash
# Enable pool logging (development only)
DATABASE_POOL_LOG=true

# Application name for database monitoring
DATABASE_APP_NAME=strellerminds-backend
```

## Recommended Settings by Environment

### Development
```bash
DATABASE_POOL_MAX=5
DATABASE_POOL_MIN=1
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=10000
DATABASE_POOL_LOG=true
```

### Staging
```bash
DATABASE_POOL_MAX=15
DATABASE_POOL_MIN=2
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=10000
DATABASE_POOL_LOG=false
```

### Production
```bash
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=10000
DATABASE_ACQUIRE_TIMEOUT=60000
DATABASE_POOL_LOG=false
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

### High-Load Production
```bash
DATABASE_POOL_MAX=50
DATABASE_POOL_MIN=10
DATABASE_IDLE_TIMEOUT=20000
DATABASE_CONNECTION_TIMEOUT=5000
DATABASE_ACQUIRE_TIMEOUT=30000
DATABASE_POOL_LOG=false
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

## Pool Sizing Guidelines

### Formula for Max Connections
```
max_connections = (cpu_cores * 4) + effective_spindle_count
```

For cloud databases:
- Small instance (1-2 vCPU): 5-10 connections
- Medium instance (2-4 vCPU): 10-20 connections
- Large instance (4-8 vCPU): 20-40 connections
- XLarge instance (8+ vCPU): 40-100 connections

### Formula for Min Connections
```
min_connections = max_connections * 0.2
```

## Monitoring Endpoints

### Check Pool Health
```bash
GET /api/database/pool/health
```

Response:
```json
{
  "healthy": true,
  "stats": {
    "totalConnections": 20,
    "activeConnections": 8,
    "idleConnections": 12,
    "waitingRequests": 0,
    "utilizationPercent": 40,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Pool Stats
```bash
GET /api/database/pool/stats
```

### Get Recent Stats History
```bash
GET /api/database/pool/stats/recent?count=10
```

### Get Average Utilization
```bash
GET /api/database/pool/utilization?minutes=5
```

## Alerts and Thresholds

### Warning Thresholds
- Pool utilization > 80%
- Waiting requests > 5

### Critical Thresholds
- Pool utilization > 95%
- Waiting requests > 10

## Troubleshooting

### Connection Pool Exhausted
**Symptoms:**
- Requests timing out
- "Connection pool exhausted" errors
- High waiting requests count

**Solutions:**
1. Increase `DATABASE_POOL_MAX`
2. Reduce `DATABASE_ACQUIRE_TIMEOUT`
3. Optimize slow queries
4. Add connection pooling at application level
5. Scale database vertically

### Too Many Idle Connections
**Symptoms:**
- High idle connection count
- Wasted database resources

**Solutions:**
1. Decrease `DATABASE_POOL_MIN`
2. Reduce `DATABASE_IDLE_TIMEOUT`
3. Implement connection reaping

### Connection Timeouts
**Symptoms:**
- Frequent connection timeout errors
- Slow application startup

**Solutions:**
1. Increase `DATABASE_CONNECTION_TIMEOUT`
2. Check network latency
3. Verify database is accessible
4. Check firewall rules

## Best Practices

1. **Start Conservative**: Begin with lower pool sizes and increase based on monitoring
2. **Monitor Continuously**: Track pool utilization and adjust accordingly
3. **Use Connection Pooling**: Always use connection pooling in production
4. **Implement Circuit Breakers**: Prevent cascading failures
5. **Set Timeouts**: Always configure connection and query timeouts
6. **Enable SSL**: Use SSL for production database connections
7. **Validate Connections**: Enable connection validation to detect stale connections
8. **Log Strategically**: Enable pool logging in development, disable in production
9. **Scale Appropriately**: Match pool size to database capacity
10. **Test Under Load**: Perform load testing to validate pool configuration
