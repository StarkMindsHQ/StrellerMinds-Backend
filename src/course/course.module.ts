import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseController } from './course.controller';
import { ContentManagementController } from './content-management.controller';
import { CourseModule as CourseModuleEntity } from './entities/module.entity';
import { CourseService } from './course.service';
import { CourseVersion } from './entities/course-version.entity';
import { Course } from './entities/course.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Lesson } from './entities/lesson.entity';
import { CourseContent } from './entities/course-content.entity';
import { ContentVersion } from './entities/content-version.entity';
import { ContentCollaboration } from './entities/content-collaboration.entity';
import { ContentTemplate } from './entities/content-template.entity';
import { ContentApproval } from './entities/content-approval.entity';
import { ContentAnalytics } from './entities/content-analytics.entity';
import { ContentManagementService } from './services/content-management.service';
import { ContentVersioningService } from './services/content-versioning.service';
import { ContentCollaborationService } from './services/content-collaboration.service';
import { ContentApprovalService } from './services/content-approval.service';
import { ContentAnalyticsService } from './services/content-analytics.service';
import { Module } from '@nestjs/common/decorators';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModuleEntity,
      Lesson,
      Enrollment,
      CourseVersion,
      CourseContent,
      ContentVersion,
      ContentCollaboration,
      ContentTemplate,
      ContentApproval,
      ContentAnalytics,
    ]),
  ],
  controllers: [CourseController, ContentManagementController],
  providers: [
    CourseService,
    ContentManagementService,
    ContentVersioningService,
    ContentCollaborationService,
    ContentApprovalService,
    ContentAnalyticsService,
  ],
  exports: [
    ContentManagementService,
    ContentVersioningService,
    ContentCollaborationService,
    ContentApprovalService,
    ContentAnalyticsService,
  ],
})
export class CourseModule {}
