export enum CacheStrategy {
  MEMORY = 'memory',
  REDIS = 'redis',
  MEMCACHED = 'memcached',
  DATABASE = 'database',
  HYBRID = 'hybrid'
}

export enum CacheEvent {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  BULK_UPDATE = 'bulk_update',
  USER_ACTION = 'user_action'
}