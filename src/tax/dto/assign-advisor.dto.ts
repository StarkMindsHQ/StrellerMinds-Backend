import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AssignAdvisorDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 128)
  propertyId: string;
}
