import { IsString, IsOptional } from 'class-validator';

export class BookOfficeHourDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
