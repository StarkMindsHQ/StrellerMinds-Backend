import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningPathController } from './learning-path.controller';
import { CurriculumBuilderService } from './services/curriculum-builder.service';
import { AdaptiveLearningService } from './services/adaptive-learning.service';
import { ObjectiveMappingService } from './services/objective-mapping.service';
import { ProgressTrackingService } from './services/progress-tracking.service';
import { TemplateLibraryService } from './services/template-library.service';
import { ExportImportService } from './services/export-import.service';
import { LearningPath } from './entities/learning-path.entity';
import { LearningPathNode } from './entities/learning-path-node.entity';
import { NodeDependency } from './entities/node-dependency.entity';
import { LearningObjective } from './entities/learning-objective.entity';
import { LearningPathEnrollment } from './entities/learning-path-enrollment.entity';
import { NodeProgress } from './entities/node-progress.entity';
import { LearningPathTemplate } from './entities/learning-path-template.entity';
import { Course } from '../course/entities/course.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LearningPath,
      LearningPathNode,
      NodeDependency,
      LearningObjective,
      LearningPathEnrollment,
      NodeProgress,
      LearningPathTemplate,
      Course,
      User,
    ]),
  ],
  controllers: [LearningPathController],
  providers: [
    CurriculumBuilderService,
    AdaptiveLearningService,
    ObjectiveMappingService,
    ProgressTrackingService,
    TemplateLibraryService,
    ExportImportService,
  ],
  exports: [
    CurriculumBuilderService,
    AdaptiveLearningService,
    ObjectiveMappingService,
    ProgressTrackingService,
    TemplateLibraryService,
    ExportImportService,
  ],
})
export class LearningPathModule {}