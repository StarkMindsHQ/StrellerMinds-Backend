import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { Progress } from './entities/progress.entity';
import { ApiTags } from '@nestjs/swagger';

/**
 * Progress module for tracking user lesson completion and progress.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Progress])],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports:[ProgressService]
})
export class ProgressModule {}
