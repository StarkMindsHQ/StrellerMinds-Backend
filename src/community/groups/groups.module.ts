import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityGroup } from './entities/community-group.entity';
import { GroupMember } from './entities/group-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityGroup,
      GroupMember,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class GroupsModule {}
