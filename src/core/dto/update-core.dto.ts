import { PartialType } from '@nestjs/swagger';
import { CreateCoreDto } from './create-core.dto';

export class UpdateCoreDto extends PartialType(CreateCoreDto) {}
