import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from './error-codes.enum';

export class ErrorDetail {
  @ApiProperty()
  field?: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  code?: string;
}

export class ErrorResponseDto {
  @ApiProperty({ enum: ErrorCode })
  errorCode: ErrorCode;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  path: string;

  @ApiProperty({ type: [ErrorDetail], required: false })
  details?: ErrorDetail[];

  @ApiProperty({ required: false })
  stack?: string;

  @ApiProperty({ required: false })
  correlationId?: string;
}
