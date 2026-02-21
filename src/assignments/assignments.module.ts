import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { Submission } from './entities/submission.entity';
import { Grade } from './entities/grade.entity';
import { Rubric } from './entities/rubric.entity';
import { Annotation } from './entities/annotation.entity';
import { PeerReview } from './entities/peer-review.entity';
import { User } from '../auth/entities/user.entity';
import { AssignmentsService } from './assignments.service';
import { SubmissionService } from './services/submission.service';
import { GradingService } from './services/grading.service';
import { PlagiarismService } from './services/plagiarism.service';
import { PeerReviewService } from './services/peer-review.service';
import { AssignmentsController } from './assignments.controller';
import { SubmissionController } from './controller/submission.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, Submission, Grade, Rubric, Annotation, PeerReview, User]),
    FilesModule,
  ],
  controllers: [AssignmentsController, SubmissionController],
  providers: [
    AssignmentsService,
    SubmissionService,
    GradingService,
    PlagiarismService,
    PeerReviewService,
  ],
  exports: [AssignmentsService, SubmissionService, GradingService],
})
export class AssignmentModule {}
