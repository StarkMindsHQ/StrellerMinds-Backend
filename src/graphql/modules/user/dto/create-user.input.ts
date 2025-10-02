import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(2)
  firstName: string;

  @Field()
  @IsString()
  @MinLength(2)
  lastName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;
}
