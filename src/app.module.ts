import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { HealthModule } from './health/health.module';
import { ContractTestingModule } from './common/contract-testing/contract-testing.module';
import { SecureLoggingModule } from './common/secure-logging/secure-logging.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'strellerminds',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    SecureLoggingModule,
    AuthModule,
    UserModule,
    CourseModule,
    HealthModule,
    ContractTestingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
