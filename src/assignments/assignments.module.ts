import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { Submission } from './entities/submission.entity';
import { Grade } from './entities/grade.entity';
import { Rubric } from './entities/rubric.entity';
import { Annotation } from './entities/annotation.entity';
import { PeerReview } from './entities/peer-review.entity';
import { AssignmentsService } from './assignments.service';
import { GradingService } from './services/grading.service';
import { PlagiarismService } from './services/plagiarism.service';
import { PeerReviewService } from './services/peer-review.service';
import { AssignmentsController } from './assignments.controller';
import { SubmissionController } from './controller/submission.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Submission,
      Grade,
      Rubric,
      Annotation,
      PeerReview
    ])
  ],
  controllers: [ SubmissionController],
  providers: [
    GradingService,
    PlagiarismService,
    PeerReviewService
  ],
  exports: [GradingService]
})
export class AssignmentModule {}