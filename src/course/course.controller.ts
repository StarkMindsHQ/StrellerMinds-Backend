import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Header,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CourseService } from './course.service';
import { StreamResponse } from '../common/decorators/stream-response.decorator';
import { StreamUtil } from '../common/utils/stream.util';

import {
  ListCoursesUseCase,
  ListCoursesRequest,
} from './application/use-cases/list-courses.use-case';
import { GetCourseUseCase, GetCourseRequest } from './application/use-cases/get-course.use-case';
import { RateLimitGuard } from 'src/auth/guards';
import { EntityNotFoundException } from '../shared/domain/exceptions/domain-exceptions';

@Controller('courses')
@UseInterceptors(ClassSerializerInterceptor)
export class CourseController {
  constructor(
    private readonly listCoursesUseCase: ListCoursesUseCase,
    private readonly getCourseUseCase: GetCourseUseCase,
  ) {}

  @UseGuards(RateLimitGuard('REGISTER'))
  @Get()
  @Header('X-Next-Cursor', '')
  @StreamResponse({ contentType: 'application/json' })
  async findAll(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('stream') stream?: boolean,
    @Res() res?: Response,
  ) {
    const defaultLimit = 20;
    const requestedLimit = limit ? parseInt(limit.toString(), 10) : defaultLimit;
    
    const result = await this.listCoursesUseCase.execute(
      new ListCoursesRequest(category, difficulty, cursor, requestedLimit),
    );

    // Use streaming if requested and response object is available
    if (stream && res) {
      res.setHeader('X-Next-Cursor', result.nextCursor || '');
      res.setHeader('X-Has-More', result.hasMore.toString());
      
      const jsonStream = StreamUtil.jsonArrayToStream(result.courses, 50);
      jsonStream.pipe(res);
      return;
    }

    // Default behavior for non-streaming requests
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const course = await this.getCourseUseCase.execute(new GetCourseRequest(id));
    if (!course) {
      throw new EntityNotFoundException('Course', id);
    }
    return course;
  }
}
