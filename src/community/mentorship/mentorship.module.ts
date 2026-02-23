import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentorProfile } from './entities/mentor-profile.entity';
import { Mentorship } from './entities/mentorship.entity';
import { MentorshipSession } from './entities/mentorship-session.entity';
import { MentorshipService } from './services/mentorship.service';
import { MentorshipController } from './controllers/mentorship.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentorProfile,
      Mentorship,
      MentorshipSession,
    ]),
  ],
  controllers: [MentorshipController],
  providers: [MentorshipService],
  exports: [MentorshipService],
})
export class MentorshipModule {}
