import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { CertificateModule } from './certificate/certificate.module';
import { ForumModule } from './forum/forum.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { FilesModule } from './files/files.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LessonModule } from './lesson/lesson.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available across all modules
      envFilePath: ['.env.development'], // Loads variables from .env file
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true, // Automatically loads entity files
        synchronize: true, // ⚠️ Auto-sync schema (disable in production)
      }),
    }),

    UsersModule,
    CoursesModule,
    AuthModule,
    CertificateModule,
    ForumModule,
    PaymentModule,
    NotificationModule,
    BlockchainModule,
    FilesModule,
    EmailModule,
    HealthModule,
    LessonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
