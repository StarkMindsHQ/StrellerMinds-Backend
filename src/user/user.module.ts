import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ShardedUserRepository } from './repositories/sharded-user.repository';
import { ShardingModule } from '../database/sharding/sharding.module';

@Module({
  imports: [ShardingModule],
  controllers: [UserController],
  providers: [UserService, ShardedUserRepository],
  exports: [UserService, ShardedUserRepository],
})
export class UserModule {}
