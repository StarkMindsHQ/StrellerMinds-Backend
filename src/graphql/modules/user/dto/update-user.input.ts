import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsOptional, IsBoolean } from 'class-validator';

import { CreateUserInput } from './create-user.input';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
