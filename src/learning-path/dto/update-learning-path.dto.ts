import { PartialType } from '@nestjs/mapped-types';
import { CreateLearningPathDto } from './create-learning-path.dto';

export class UpdateLearningPathDto extends PartialType(CreateLearningPathDto) {}