import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

// Import all entities
import { User } from '../../src/users/entities/user.entity';
import { RefreshToken } from '../../src/auth/entities/refresh-token.entity';
import { Course } from '../../src/courses/entities/course.entity';
import { Lesson } from '../../src/lesson/entity/lesson.entity';
import { Enrollment } from '../../src/enrollment/entities/enrollment.entity';
import { Progress } from '../../src/progress/entities/progress.entity';
import { Video } from '../../src/video-streaming/entities/video.entity';
import { VideoQuality } from '../../src/video-streaming/entities/video-quality.entity';
import { VideoAnalytics } from '../../src/video-streaming/entities/video-analytics.entity';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isTestEnv = process.env.NODE_ENV === 'test';

        if (!isTestEnv) {
          throw new Error('DatabaseTestModule should only be used in test environment');
        }

        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', 'password'),
          database: configService.get('DB_DATABASE', 'strellerminds_test'),
          entities: [
            User,
            RefreshToken,
            Course,
            Lesson,
            Enrollment,
            Progress,
            Video,
            VideoQuality,
            VideoAnalytics,
          ],
          synchronize: true, // Only for testing
          dropSchema: true, // Clean database on each test run
          logging: false,
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (dataSource: DataSource) => {
        return dataSource;
      },
      inject: [DataSource],
    },
  ],
  exports: ['DATABASE_CONNECTION'],
})
export class DatabaseTestModule {
  constructor(private dataSource: DataSource) {
    // Add cleanup utility to global test utils
    global.testUtils.cleanupDatabase = async () => {
      if (this.dataSource.isInitialized) {
        const entities = this.dataSource.entityMetadatas;

        // Disable foreign key checks
        await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0;');

        // Clear all tables
        for (const entity of entities) {
          const repository = this.dataSource.getRepository(entity.name);
          await repository.clear();
        }

        // Re-enable foreign key checks
        await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1;');
      }
    };

    // Add seeding utility
    global.testUtils.seedDatabase = async (seedData: any) => {
      if (this.dataSource.isInitialized) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // Seed users
          if (seedData.users) {
            const userRepository = this.dataSource.getRepository(User);
            await userRepository.save(seedData.users);
          }

          // Seed courses
          if (seedData.courses) {
            const courseRepository = this.dataSource.getRepository(Course);
            await courseRepository.save(seedData.courses);
          }

          // Seed other entities...

          await queryRunner.commitTransaction();
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      }
    };

    // Add transaction utility for tests
    global.testUtils.runInTransaction = async (callback: (queryRunner: any) => Promise<void>) => {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await callback(queryRunner);
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    };
  }
}
