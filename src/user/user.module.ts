import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserPersistenceEntity } from './infrastructure/persistence/user-persistence.entity';
import { UserRepositoryImpl } from './infrastructure/repositories/user-repository.impl';
import { UserMapper } from './application/mappers/user.mapper';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { USER_REPOSITORY } from './domain/repositories/user-repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile, UserPersistenceEntity])],
  controllers: [UserController],
  providers: [
    UserService,
    UserMapper,
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
    ListUsersUseCase,
    GetUserUseCase,
  ],
  exports: [UserService],
})
export class UserModule {}
