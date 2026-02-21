import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { Submission } from './entities/submission.entity';
import { Grade } from './entities/grade.entity';
import { Rubric } from './entities/rubric.entity';
import { Annotation } from './entities/annotation.entity';
import { PeerReview } from './entities/peer-review.entity';
import { Assessment } from './entities/assessment.entity';
import { Question } from './entities/question.entity';
import { Option } from './entities/option.entity';
import { Attempt } from './entities/attempt.entity';
import { AttemptAnswer } from './entities/attempt-answer.entity';
import { ProctoringSession } from './entities/proctoring.entity';
import { User } from '../auth/entities/user.entity';
import { AssignmentsService } from './assignments.service';
import { SubmissionService } from './services/submission.service';
import { GradingService } from './services/grading.service';
import { PlagiarismService } from './services/plagiarism.service';
import { PeerReviewService } from './services/peer-review.service';
import { AssessmentsService } from './services/assessments.service';
import { QuestionsService } from './services/questions.service';
import { AttemptsService } from './services/attempts.service';
import { AssignmentsController } from './assignments.controller';
import { SubmissionController } from './controller/submission.controller';
import { AssessmentsController } from './controller/assessments.controller';
import { AttemptsController } from './controller/attempts.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Submission,
      Grade,
      Rubric,
      Annotation,
      PeerReview,
      User,
      Assessment,
      Question,
      Option,
      Attempt,
      AttemptAnswer,
      ProctoringSession,
    ]),
    FilesModule,
  ],
  controllers: [AssignmentsController, SubmissionController, AssessmentsController, AttemptsController],
  providers: [
    AssignmentsService,
    SubmissionService,
    GradingService,
    PlagiarismService,
    PeerReviewService,
    AssessmentsService,
    QuestionsService,
    AttemptsService,
  ],
  exports: [AssignmentsService, SubmissionService, GradingService, AssessmentsService, AttemptsService],
})
export class AssignmentModule {}
