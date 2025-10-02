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
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CourseService } from './courses.service';
import { CreateCourseDto } from './dtos/create.course.dto';
import { UpdateCourseDto } from './dtos/update.course.dto';
import { ElectiveCourseQueryDto } from './dtos/elective-course-query.dto';
import { PremiumContentGuard } from '../billing/premium-content.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { ElectiveCourse } from 'src/elective-course/entities/elective-course.entity';
import { Repository } from 'typeorm';
import { UserElectiveCourseService } from './user-elective-course.service';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly enrollmentService: UserElectiveCourseService,
    @InjectRepository(ElectiveCourse)
    private readonly courseRepo: Repository<ElectiveCourse>,
  ) {}

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

  @ApiOperation({ summary: 'Get elective courses with search and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of elective courses with applied filters.',
  })
  @Get('elective-courses')
  public async findElectiveCourses(@Query() query: ElectiveCourseQueryDto) {
    return await this.courseService.findElectiveCourses(query);
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

  @Post(':id/enroll')
  async enroll(@Req() req: any, @Param('id') courseId: string) {
    const user = req.user; // from JWT payload
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new Error('Course not found');
    return this.enrollmentService.enroll(user, course);
  }

  @Get('enrolled')
  async getEnrollments(@Req() req: any) {
    return this.enrollmentService.getEnrollments(req.user.id);
  }

  @Delete(':id/enroll')
  async unenroll(@Req() req: any, @Param('id') courseId: string) {
    return this.enrollmentService.unenroll(req.user.id, courseId);
  }
}
