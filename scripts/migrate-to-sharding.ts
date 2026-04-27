#!/usr/bin/env node

/**
 * Database Sharding Migration Script
 * 
 * This script helps migrate existing data from a single database
 * to a sharded setup for issue #809 implementation.
 * 
 * Usage:
 * npm run migrate:sharding
 * 
 * Environment variables required:
 * - DATABASE_HOST: Original database host
 * - DATABASE_PORT: Original database port  
 * - DATABASE_NAME: Original database name
 * - DATABASE_USER: Original database user
 * - DATABASE_PASSWORD: Original database password
 * - DATABASE_SHARD_COUNT: Number of shards to create
 * - DATABASE_SHARD_*_HOST: Shard host configurations
 * - DATABASE_SHARD_*_PORT: Shard port configurations
 * - DATABASE_SHARD_*_NAME: Shard database names
 * - DATABASE_SHARD_*_USER: Shard database users
 * - DATABASE_SHARD_*_PASSWORD: Shard database passwords
 */

import { DataSource } from 'typeorm';
import { User } from '../src/user/entities/user.entity';
import { Course } from '../src/course/entities/course.entity';
import { createHash } from 'crypto';

interface MigrationConfig {
  originalDatabase: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  shardCount: number;
  shards: Array<{
    id: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }>;
}

class ShardingMigration {
  private originalConnection: DataSource;
  private shardConnections: Map<string, DataSource> = new Map();
  private config: MigrationConfig;

  constructor() {
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): MigrationConfig {
    const shardCount = parseInt(process.env.DATABASE_SHARD_COUNT || '4');
    
    const config: MigrationConfig = {
      originalDatabase: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME || 'strellerminds',
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || '',
      },
      shardCount,
      shards: [],
    };

    // Load shard configurations
    for (let i = 0; i < shardCount; i++) {
      config.shards.push({
        id: `shard-${i}`,
        host: process.env[`DATABASE_SHARD_${i}_HOST`] || 'localhost',
        port: parseInt(process.env[`DATABASE_SHARD_${i}_PORT`] || (5432 + i).toString()),
        database: process.env[`DATABASE_SHARD_${i}_NAME`] || `strellerminds_shard_${i}`,
        username: process.env[`DATABASE_SHARD_${i}_USER`] || 'postgres',
        password: process.env[`DATABASE_SHARD_${i}_PASSWORD`] || '',
      });
    }

    return config;
  }

  private async createConnection(config: any): Promise<DataSource> {
    const dataSource = new DataSource({
      type: 'postgres',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      entities: [User, Course],
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    return dataSource;
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing sharding migration...');
    
    // Connect to original database
    this.originalConnection = await this.createConnection(this.config.originalDatabase);
    console.log('✅ Connected to original database');

    // Connect to all shards
    for (const shard of this.config.shards) {
      try {
        const connection = await this.createConnection(shard);
        this.shardConnections.set(shard.id, connection);
        console.log(`✅ Connected to shard: ${shard.id}`);
      } catch (error) {
        console.error(`❌ Failed to connect to shard ${shard.id}:`, error);
        throw error;
      }
    }
  }

  private getShardId(key: string, totalShards: number): string {
    const hash = createHash('md5').update(key).digest('hex');
    const shardIndex = parseInt(hash.substring(0, 8), 16) % totalShards;
    return `shard-${shardIndex}`;
  }

  async migrateUsers(): Promise<void> {
    console.log('👥 Starting user migration...');
    
    const userRepository = this.originalConnection.getRepository(User);
    const users = await userRepository.find();
    
    console.log(`Found ${users.length} users to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Determine shard based on user ID
        const shardId = this.getShardId(user.id, this.config.shardCount);
        const shardConnection = this.shardConnections.get(shardId);
        
        if (!shardConnection) {
          throw new Error(`No connection found for shard: ${shardId}`);
        }

        // Set shard key
        user.setShardKey();

        // Save to shard
        const shardUserRepository = shardConnection.getRepository(User);
        await shardUserRepository.save(user);
        
        migrated++;
        
        if (migrated % 100 === 0) {
          console.log(`Migrated ${migrated}/${users.length} users...`);
        }
      } catch (error) {
        console.error(`Error migrating user ${user.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ User migration completed: ${migrated} migrated, ${errors} errors`);
  }

  async migrateCourses(): Promise<void> {
    console.log('📚 Starting course migration...');
    
    const courseRepository = this.originalConnection.getRepository(Course);
    const courses = await courseRepository.find();
    
    console.log(`Found ${courses.length} courses to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const course of courses) {
      try {
        // Determine shard based on instructor ID or course ID
        const shardKey = course.instructorId || course.id;
        const shardId = this.getShardId(shardKey, this.config.shardCount);
        const shardConnection = this.shardConnections.get(shardId);
        
        if (!shardConnection) {
          throw new Error(`No connection found for shard: ${shardId}`);
        }

        // Set shard key
        course.setShardKey();

        // Save to shard
        const shardCourseRepository = shardConnection.getRepository(Course);
        await shardCourseRepository.save(course);
        
        migrated++;
        
        if (migrated % 100 === 0) {
          console.log(`Migrated ${migrated}/${courses.length} courses...`);
        }
      } catch (error) {
        console.error(`Error migrating course ${course.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Course migration completed: ${migrated} migrated, ${errors} errors`);
  }

  async verifyMigration(): Promise<void> {
    console.log('🔍 Verifying migration...');
    
    // Count original records
    const originalUserCount = await this.originalConnection.getRepository(User).count();
    const originalCourseCount = await this.originalConnection.getRepository(Course).count();
    
    // Count sharded records
    let shardedUserCount = 0;
    let shardedCourseCount = 0;

    for (const [shardId, connection] of this.shardConnections) {
      const userCount = await connection.getRepository(User).count();
      const courseCount = await connection.getRepository(Course).count();
      
      shardedUserCount += userCount;
      shardedCourseCount += courseCount;
      
      console.log(`Shard ${shardId}: ${userCount} users, ${courseCount} courses`);
    }

    console.log(`Original: ${originalUserCount} users, ${originalCourseCount} courses`);
    console.log(`Sharded: ${shardedUserCount} users, ${shardedCourseCount} courses`);

    if (originalUserCount === shardedUserCount && originalCourseCount === shardedCourseCount) {
      console.log('✅ Migration verification successful!');
    } else {
      console.log('❌ Migration verification failed - counts do not match');
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up connections...');
    
    await this.originalConnection.destroy();
    
    for (const [shardId, connection] of this.shardConnections) {
      await connection.destroy();
      console.log(`Closed connection to shard: ${shardId}`);
    }
    
    this.shardConnections.clear();
    console.log('✅ Cleanup completed');
  }

  async run(): Promise<void> {
    try {
      await this.initialize();
      await this.migrateUsers();
      await this.migrateCourses();
      await this.verifyMigration();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const migration = new ShardingMigration();
  migration.run()
    .then(() => {
      console.log('🎉 Sharding migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { ShardingMigration };
