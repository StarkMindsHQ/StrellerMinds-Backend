import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentorshipModule } from './mentorship/mentorship.module';
import { GroupsModule } from './groups/groups.module';
import { SupportModule } from './support/support.module';
import { EventsModule } from './events/events.module';
import { RecognitionModule } from './recognition/recognition.module';
import { ModerationModule } from './moderation/moderation.module';
import { CommunityAnalyticsModule } from './analytics/community-analytics.module';

@Module({
  imports: [
    MentorshipModule,
    GroupsModule,
    SupportModule,
    EventsModule,
    RecognitionModule,
    ModerationModule,
    CommunityAnalyticsModule,
  ],
  exports: [
    MentorshipModule,
    GroupsModule,
    SupportModule,
    EventsModule,
    RecognitionModule,
    ModerationModule,
    CommunityAnalyticsModule,
  ],
})
export class CommunityModule {}
