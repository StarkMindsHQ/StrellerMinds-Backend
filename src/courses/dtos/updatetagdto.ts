import { PartialType } from '@nestjs/mapped-types';
import { CreateTagDto } from './createetagdto';


export class UpdateTagDto extends PartialType(CreateTagDto) {}