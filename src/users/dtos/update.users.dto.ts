import { PartialType } from '@nestjs/mapped-types';
import { CreateUsersDto } from './create.users.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating user information (partial fields allowed)
 */
export class updateUsersDto extends PartialType(CreateUsersDto) {}
