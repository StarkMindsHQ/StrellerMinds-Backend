var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
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
let DatabaseTestModule = class DatabaseTestModule {
    constructor(dataSource) {
        this.dataSource = dataSource;
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
        global.testUtils.seedDatabase = async (seedData) => {
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
                }
                catch (error) {
                    await queryRunner.rollbackTransaction();
                    throw error;
                }
                finally {
                    await queryRunner.release();
                }
            }
        };
        // Add transaction utility for tests
        global.testUtils.runInTransaction = async (callback) => {
            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                await callback(queryRunner);
                await queryRunner.commitTransaction();
            }
            catch (error) {
                await queryRunner.rollbackTransaction();
                throw error;
            }
            finally {
                await queryRunner.release();
            }
        };
    }
};
DatabaseTestModule = __decorate([
    Global(),
    Module({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env.test',
            }),
            TypeOrmModule.forRootAsync({
                imports: [ConfigModule],
                useFactory: async (configService) => {
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
                useFactory: async (dataSource) => {
                    return dataSource;
                },
                inject: [DataSource],
            },
        ],
        exports: ['DATABASE_CONNECTION'],
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof DataSource !== "undefined" && DataSource) === "function" ? _a : Object])
], DatabaseTestModule);
export { DatabaseTestModule };
