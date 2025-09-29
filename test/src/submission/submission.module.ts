import { Module } from '@nestjs/common';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './provider/submission.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from './submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Submission])],
  controllers: [SubmissionController],
  providers: [SubmissionService],
  exports: [SubmissionService],
})
export class SubmissionModule {}
