import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CourseVersionsService } from '../services/course-versions.service';
import { CreateCourseVersionDto } from '../dto/course-version.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/role/roles.decorator';
import { RolesGuard } from 'src/role/roles.guard';
import { Role } from 'src/role/roles.enum';

@Controller('courses/:courseId/versions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Instructor, Role.Admin)
export class CourseVersionsController {
  constructor(private readonly versionsService: CourseVersionsService) {}

  @Post()
  createVersion(
    @Param('courseId') courseId: string,
    @Body() createVersionDto: CreateCourseVersionDto,
  ) {
    return this.versionsService.createVersion(courseId, createVersionDto);
  }

  @Get()
  getCourseVersions(@Param('courseId') courseId: string) {
    return this.versionsService.getCourseVersions(courseId);
  }

  @Get(':versionId')
  getVersion(@Param('versionId') versionId: string) {
    return this.versionsService.getVersion(versionId);
  }

  @Patch(':versionId/publish')
  publishVersion(@Param('versionId') versionId: string) {
    return this.versionsService.publishVersion(versionId);
  }

  @Get(':versionId1/compare/:versionId2')
  compareVersions(
    @Param('versionId1') versionId1: string,
    @Param('versionId2') versionId2: string,
  ) {
    return this.versionsService.compareVersions(versionId1, versionId2);
  }
}
