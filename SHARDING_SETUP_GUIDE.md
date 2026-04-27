# Database Sharding Setup Guide - Issue #809

This guide will help you set up and configure database sharding for the StrellerMinds backend application.

## 🚀 Quick Start

### 1. Environment Configuration

Copy the sharding environment template and configure your shard databases:

```bash
cp .env.sharding.example .env
```

Update the `.env` file with your actual shard configurations:

```bash
# Number of database shards
DATABASE_SHARD_COUNT=4

# Shard 0 Configuration (Primary)
DATABASE_SHARD_0_HOST=localhost
DATABASE_SHARD_0_PORT=5432
DATABASE_SHARD_0_NAME=strellerminds_shard_0
DATABASE_SHARD_0_USER=your_shard_user_0
DATABASE_SHARD_0_PASSWORD=your_shard_password_0

# Shard 1 Configuration
DATABASE_SHARD_1_HOST=localhost
DATABASE_SHARD_1_PORT=5433
DATABASE_SHARD_1_NAME=strellerminds_shard_1
DATABASE_SHARD_1_USER=your_shard_user_1
DATABASE_SHARD_1_PASSWORD=your_shard_password_1

# Additional shards...
```

### 2. Database Setup

Create the shard databases:

```sql
-- Create shard databases
CREATE DATABASE strellerminds_shard_0;
CREATE DATABASE strellerminds_shard_1;
CREATE DATABASE strellerminds_shard_2;
CREATE DATABASE strellerminds_shard_3;

-- Create users for each shard
CREATE USER strellerminds_shard_0 WITH PASSWORD 'your_password_0';
CREATE USER strellerminds_shard_1 WITH PASSWORD 'your_password_1';
CREATE USER strellerminds_shard_2 WITH PASSWORD 'your_password_2';
CREATE USER strellerminds_shard_3 WITH PASSWORD 'your_password_3';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE strellerminds_shard_0 TO strellerminds_shard_0;
GRANT ALL PRIVILEGES ON DATABASE strellerminds_shard_1 TO strellerminds_shard_1;
GRANT ALL PRIVILEGES ON DATABASE strellerminds_shard_2 TO strellerminds_shard_2;
GRANT ALL PRIVILEGES ON DATABASE strellerminds_shard_3 TO strellerminds_shard_3;
```

### 3. Migration (if you have existing data)

If you're migrating from a single database, run the migration script:

```bash
npm run migrate:sharding
```

Add this script to your `package.json`:

```json
{
  "scripts": {
    "migrate:sharding": "ts-node scripts/migrate-to-sharding.ts"
  }
}
```

### 4. Start the Application

```bash
npm run start:dev
```

## 📊 Sharding Strategy

### User Data
- **Shard Key**: `userId` (UUID)
- **Algorithm**: Consistent hashing (MD5)
- **Distribution**: Even across all shards

### Course Data
- **Shard Key**: `instructorId` (UUID)
- **Algorithm**: Consistent hashing (MD5)
- **Distribution**: Based on course instructor

### Shared Data
- **Shard Key**: Entity `id`
- **Algorithm**: Simple hash
- **Distribution**: Replicated across shards

## 🔧 Configuration Options

### Connection Pooling
```bash
DATABASE_POOL_MAX=10
DATABASE_POOL_MIN=1
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=10000
```

### Health Monitoring
```bash
SHARD_HEALTH_CHECK_INTERVAL=30000
SHARD_HEALTH_CHECK_TIMEOUT=5000
SHARD_AUTO_RECONNECT_ENABLED=true
SHARD_MAX_RETRY_ATTEMPTS=3
```

### Migration Settings
```bash
SHARD_MIGRATION_BATCH_SIZE=100
SHARD_REBALANCING_ENABLED=false
SHARD_REBALANCING_THRESHOLD=0.8
```

## 📈 Monitoring & Management

### API Endpoints

#### Monitoring
- `GET /sharding/stats` - Sharding statistics
- `GET /sharding/connections` - Connection health
- `GET /sharding/shards` - All shard configurations
- `GET /sharding/health/:shardId` - Specific shard health

#### Management
- `POST /sharding/reconnect/:shardId` - Reconnect shard
- `POST /sharding/migrate` - Migrate data between shards
- `GET /sharding/distribution` - Data distribution stats
- `GET /sharding/strategies` - Available sharding strategies

### Example API Calls

```bash
# Get sharding statistics
curl http://localhost:3000/sharding/stats

# Check connection health
curl http://localhost:3000/sharding/connections

# Get data distribution
curl http://localhost:3000/sharding/distribution

# Reconnect a specific shard
curl -X POST http://localhost:3000/sharding/reconnect/shard-1
```

## 🧪 Testing

### Unit Tests
```bash
npm test -- --testPathPattern=sharding
```

### Integration Tests
The sharding implementation includes comprehensive test coverage:
- Shard key distribution tests
- Connection management tests
- Cross-shard query tests
- Migration tests

## 🔄 Migration Process

### For New Applications
1. Set up shard databases
2. Configure environment variables
3. Start the application with sharding enabled

### For Existing Applications
1. Set up new shard databases
2. Configure environment variables
3. Run migration script to distribute existing data
4. Update application to use sharded repositories
5. Monitor and verify data distribution

### Gradual Rollout Strategy
1. **Phase 1**: Set up sharding infrastructure
2. **Phase 2**: Enable read-only sharding for testing
3. **Phase 3**: Enable write operations gradually
4. **Phase 4**: Full sharding deployment
5. **Phase 5**: Monitor and optimize

## 🚨 Troubleshooting

### Common Issues

#### Connection Failures
```bash
# Check shard connectivity
curl http://localhost:3000/sharding/connections

# Reconnect failed shards
curl -X POST http://localhost:3000/sharding/reconnect/shard-0
```

#### Data Distribution Issues
```bash
# Check data distribution
curl http://localhost:3000/sharding/distribution

# Run rebalancing if needed
curl -X POST http://localhost:3000/sharding/rebalance
```

#### Performance Issues
- Monitor query performance per shard
- Check connection pool utilization
- Verify shard key distribution

### Health Checks

The application includes automatic health monitoring:
- Connection health checks every 30 seconds
- Automatic reconnection for failed shards
- Performance metrics collection

## 🔒 Security Considerations

### Database Security
- Use separate credentials per shard
- Implement network isolation between shards
- Enable SSL/TLS for database connections
- Regular security audits

### Application Security
- Validate shard key inputs
- Implement rate limiting for sharding APIs
- Monitor for unusual sharding patterns
- Audit sharding operations

## 📚 Best Practices

### Performance Optimization
1. **Choose appropriate shard keys** - Use evenly distributed keys
2. **Monitor shard distribution** - Avoid hot shards
3. **Optimize cross-shard queries** - Minimize when possible
4. **Implement caching** - Reduce database load

### Operational Excellence
1. **Regular health checks** - Monitor all shards
2. **Backup strategy** - Per-shard backup schedules
3. **Disaster recovery** - Shard recovery procedures
4. **Capacity planning** - Plan for shard growth

### Development Practices
1. **Test sharding logic** - Comprehensive test coverage
2. **Mock sharding in tests** - Isolate testing environment
3. **Document shard strategies** - Clear documentation
4. **Monitor performance** - Continuous performance tracking

## 🚀 Future Enhancements

### Planned Features
1. **Dynamic Sharding** - Automatic shard creation
2. **Smart Routing** - Query optimization
3. **Multi-Region Support** - Geographic distribution
4. **Advanced Analytics** - Real-time metrics
5. **Auto-Rebalancing** - Dynamic data redistribution

### Scaling Considerations
- Horizontal scaling with additional shards
- Geographic distribution for global applications
- Read replicas for improved performance
- Caching layers for frequently accessed data

## 📞 Support

If you encounter issues with the sharding implementation:

1. Check the application logs for detailed error messages
2. Verify your shard database configurations
3. Ensure all shard databases are accessible
4. Review the troubleshooting section above
5. Check the API documentation for detailed endpoint information

## 🎯 Success Metrics

A successful sharding implementation should achieve:
- **Horizontal Scaling**: Ability to add more shards as data grows
- **Performance Improvement**: Reduced query latency
- **High Availability**: System continues operating even if some shards fail
- **Data Consistency**: Accurate data distribution across shards
- **Operational Efficiency**: Easy monitoring and maintenance
