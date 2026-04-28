import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Stream } from 'stream';
import { STREAM_RESPONSE } from '../decorators/stream-response.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class StreamingResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const streamOptions = this.reflector.get(STREAM_RESPONSE, context.getHandler());

    if (streamOptions) {
      // Enable streaming headers
      response.setHeader('Transfer-Encoding', 'chunked');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      
      if (streamOptions.contentType) {
        response.setHeader('Content-Type', streamOptions.contentType);
      }
    }
    
    return next.handle();
  }
}
