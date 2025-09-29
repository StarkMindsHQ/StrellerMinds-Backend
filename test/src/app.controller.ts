import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { CustomException } from './common/errors/custom.exception';
import { ErrorCode } from './common/errors/error-codes.enum';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-error/:type')
  testError(@Param('type') type: string) {
    switch (type) {
      case 'not-found':
        throw new CustomException(
          ErrorCode.NOT_FOUND,
          'Resource not found',
          404
        );
      case 'validation':
        throw new CustomException(
          ErrorCode.INVALID_INPUT,
          'Validation failed',
          400,
          [
            {
              field: 'email',
              message: 'Invalid email format'
            }
          ]
        );
      case 'unauthorized':
        throw new CustomException(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          401
        );
      default:
        return { message: 'Test endpoint working' };
    }
  }
}
