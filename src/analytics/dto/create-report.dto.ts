import { IsString, IsObject, IsOptional } from 'class-validator';

export class CreateReportDto {
  @IsString()
  name: string;

  @IsObject()
  config: any;

  @IsOptional()
  scheduled?: boolean;

  @IsOptional()
  cronExpression?: string;
}
