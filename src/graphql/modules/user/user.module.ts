import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UserResolver } from './resolvers/user.resolver';
import { UserService } from './services/user.service';
import { UserLoader } from './loaders/user.loader';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserResolver, UserService, UserLoader],
  exports: [UserService, UserLoader],
})
export class UserModule {}
