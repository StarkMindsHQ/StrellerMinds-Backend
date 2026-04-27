# Database Sharding Implementation

This directory contains the complete sharding implementation for the StrellerMinds backend application.

## Overview

The sharding system provides horizontal scaling by distributing data across multiple database shards based on configurable sharding strategies.

## Architecture

### Core Components

1. **ShardingConfig** - Configuration management for shard connections
2. **ShardKeyService** - Shard key generation and distribution logic
3. **ShardConnectionService** - Connection management for multiple shards
4. **ShardingService** - High-level sharding operations and query routing
5. **BaseShardedRepository** - Base repository class for sharded entities

### Sharding Strategies

- **User Strategy**: Shards user data by `userId` using consistent hashing
- **Course Strategy**: Shards course data by `instructorId` using consistent hashing
- **Shared Strategy**: Replicates shared data across all shards

## Configuration

### Environment Variables

```bash
# Number of shards
DATABASE_SHARD_COUNT=4

# Individual shard configurations
DATABASE_SHARD_0_HOST=localhost
DATABASE_SHARD_0_PORT=5432
DATABASE_SHARD_0_NAME=strellerminds_shard_0
DATABASE_SHARD_0_USER=postgres
DATABASE_SHARD_0_PASSWORD=password

# Repeat for each shard...
```

### Connection Pool Settings

Each shard maintains its own connection pool with configurable settings:

- `DATABASE_POOL_MAX`: Maximum connections per shard
- `DATABASE_POOL_MIN`: Minimum connections per shard
- `DATABASE_IDLE_TIMEOUT`: Connection idle timeout

## Usage

### Entity Setup

Entities must include sharding support:

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  shardKey: string; // Used for sharding

  // Helper methods
  getShardKey(): string {
    return this.shardKey || this.id;
  }

  setShardKey(): void {
    this.shardKey = this.id;
  }
}
```

### Repository Usage

Use the sharded repositories for data operations:

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly shardedUserRepository: ShardedUserRepository,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    return this.shardedUserRepository.createUser(userData);
  }

  async findById(id: string): Promise<User | null> {
    return this.shardedUserRepository.findById(id);
  }
}
```

### Cross-Shard Operations

For operations that need to query multiple shards:

```typescript
// Find across all shards
const users = await this.shardedUserRepository.findByField('email', email);

// Execute custom query across all shards
const results = await this.shardedUserRepository.executeAcrossAllShards(
  async (repository) => {
    return repository.find({ where: { isActive: true } });
  }
);
```

## Sharding Algorithm

### Consistent Hashing

The system uses MD5-based consistent hashing for even distribution:

```typescript
private consistentHash(key: string): number {
  const hash = createHash('md5').update(key).digest('hex');
  return parseInt(hash.substring(0, 8), 16);
}
```

### Shard Selection

Shard ID is determined by: `hash(key) % shardCount`

## Monitoring and Health

### Health Checks

Automatic health checks run for each shard:

```typescript
await this.shardConnectionService.isConnectionHealthy('shard-0');
```

### Statistics

Get sharding statistics:

```typescript
const stats = await this.shardingService.getShardingStats();
// Returns: totalShards, activeConnections, shardDistribution
```

### API Endpoints

The system provides monitoring endpoints:

- `GET /sharding/stats` - Overall sharding statistics
- `GET /sharding/connections` - Connection health status
- `GET /sharding/shards` - All shard configurations
- `POST /sharding/reconnect/:shardId` - Reconnect specific shard

## Migration and Rebalancing

### Data Migration

Move data between shards:

```typescript
const result = await this.shardingService.migrateData(
  User,
  'shard-0',
  'shard-1',
  100 // batch size
);
```

### Rebalancing

Automatic rebalancing can be enabled when shard distribution becomes uneven:

```bash
SHARD_REBALANCING_ENABLED=true
SHARD_REBALANCING_THRESHOLD=0.8
```

## Performance Considerations

### Query Optimization

1. **Single-shard queries**: Use shard-specific operations when possible
2. **Cross-shard queries**: Minimize and use pagination
3. **Connection pooling**: Configure appropriate pool sizes per shard

### Best Practices

1. **Shard Key Selection**: Choose keys with even distribution
2. **Query Patterns**: Design queries to minimize cross-shard operations
3. **Monitoring**: Regular monitoring of shard distribution and performance

## Error Handling

### Connection Failures

The system provides automatic reconnection:

```typescript
await this.shardConnectionService.reconnectShard('shard-0');
```

### Query Failures

Cross-shard operations continue even if individual shards fail:

```typescript
const results = await this.shardingService.executeAcrossAllShards(
  async (repository) => {
    try {
      return await repository.find();
    } catch (error) {
      console.warn('Shard query failed:', error);
      return [];
    }
  }
);
```

## Testing

### Unit Testing

Mock the sharding service for unit tests:

```typescript
const mockShardingService = {
  findById: jest.fn(),
  save: jest.fn(),
  // ...
};
```

### Integration Testing

Use test shards for integration testing:

```bash
DATABASE_SHARD_COUNT=2
DATABASE_SHARD_0_HOST=localhost
DATABASE_SHARD_0_PORT=5432
DATABASE_SHARD_0_NAME=test_shard_0
```

## Deployment

### Production Considerations

1. **High Availability**: Configure read replicas for each shard
2. **Backup Strategy**: Implement per-shard backup schedules
3. **Monitoring**: Set up alerts for shard health and performance
4. **Security**: Use separate credentials for each shard

### Scaling

Add new shards by:

1. Configure new shard in environment
2. Update `DATABASE_SHARD_COUNT`
3. Run data migration to redistribute data
4. Update application configuration

## Troubleshooting

### Common Issues

1. **Uneven Distribution**: Check sharding key selection
2. **Connection Timeouts**: Adjust pool settings
3. **Cross-Shard Performance**: Optimize query patterns

### Debug Tools

- Connection health monitoring
- Query performance tracking
- Shard distribution analysis
- Error logging and alerting

## Future Enhancements

1. **Dynamic Sharding**: Automatic shard creation based on load
2. **Smart Routing**: Query optimization based on data distribution
3. **Multi-Region Support**: Geographic data distribution
4. **Advanced Analytics**: Real-time sharding metrics and insights
