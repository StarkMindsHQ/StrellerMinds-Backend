/**
 * CourseController handles course CRUD operations.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CourseService } from './courses.service';
import { CreateCourseDto } from './dtos/create.course.dto';
import { UpdateCourseDto } from './dtos/update.course.dto';
import { PremiumContentGuard } from '../billing/premium-content.guard';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @ApiOperation({ summary: 'Create a new course' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({ status: 201, description: 'Course created successfully.' })
  @Post()
  public async create(@Body() createCourseDto: CreateCourseDto) {
    return await this.courseService.create(createCourseDto);
  }

  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, description: 'List of courses.' })
  @Get()
  public async findAll() {
    return await this.courseService.findAll();
  }

  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course found.' })
  @Get(':id')
  @UseGuards(PremiumContentGuard)
  public async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.courseService.findOne(id);
  }

  @ApiOperation({ summary: 'Update course' })
  @ApiParam({ name: 'id', type: 'string', description: 'Course ID' })
  @ApiBody({ type: UpdateCourseDto })
  @ApiResponse({ status: 200, description: 'Course updated.' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return await this.courseService.update(id, updateCourseDto);
  }

  @ApiOperation({ summary: 'Delete course' })
  @ApiParam({ name: 'id', type: 'string', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course deleted.' })
  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.courseService.delete(id);
  }
}
