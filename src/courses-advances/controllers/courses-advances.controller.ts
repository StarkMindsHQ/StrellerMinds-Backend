import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CreateCoursesAdvanceDto } from '../dto/create-courses-advance.dto';
import { UpdateCoursesAdvanceDto } from '../dto/update-courses-advance.dto';
import { CoursesAdvancesService } from '../services/courses-advances.service';
import { Roles } from 'src/role/roles.decorator';
import { RolesGuard } from 'src/role/roles.guard';
import { Role } from 'src/role/roles.enum';

@Controller('courses-advances')
export class CoursesAdvancesController {
  constructor(private readonly coursesAdvancesService: CoursesAdvancesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.Instructor)
  create(@Body() createCourseDto: CreateCoursesAdvanceDto, @Req() req) {
    return this.coursesAdvancesService.create(createCourseDto, req.user.id);
  }

  @Get()
  findAll(@Query('instructor') instructorId?: string) {
    return this.coursesAdvancesService.findAll(instructorId);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.coursesAdvancesService.searchCourses(query);
  }

  @Get('popular')
  getPopular(@Query('limit') limit?: number) {
    return this.coursesAdvancesService.getPopularCourses(limit);
  }

  @Get('category/:category')
  getByCategory(@Param('category') category: string) {
    return this.coursesAdvancesService.getCoursesByCategory(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesAdvancesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.Instructor, Role.Admin)
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCoursesAdvanceDto, @Req() req) {
    return this.coursesAdvancesService.update(id, updateCourseDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.Instructor, Role.Admin)
  remove(@Param('id') id: string, @Req() req) {
    return this.coursesAdvancesService.remove(id, req.user.id);
  }
}
