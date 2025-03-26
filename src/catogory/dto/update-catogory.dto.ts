import { PartialType } from '@nestjs/swagger';
import { CreateCatogoryDto } from './create-catogory.dto';

export class UpdateCatogoryDto extends PartialType(CreateCatogoryDto) {}
