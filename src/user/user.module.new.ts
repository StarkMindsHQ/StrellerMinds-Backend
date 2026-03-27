import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserActivity } from './entities/user-activity.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service.new';
import { RepositoryModule } from '../common/repositories/repository.module';
import { UserRepository } from '../common/repositories/implementations/user.repository';
import { UserActivityRepository } from '../common/repositories/implementations/user-activity.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserActivity]),
    RepositoryModule.forRoot(),
    RepositoryModule.forCustomRepositories([UserRepository, UserActivityRepository]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
