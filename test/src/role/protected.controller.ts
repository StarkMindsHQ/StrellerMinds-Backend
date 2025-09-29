/* eslint-disable prettier/prettier */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { Role } from './roles.enum';

@Controller('protected')
@UseGuards(RolesGuard) // Apply the RolesGuard to this controller
export class ProtectedController {
  @Get('admin')
  @Roles(Role.Admin)
  adminEndpoint() {
    return 'Admin Access Granted';
  }

  @Get('instructor')
  @Roles(Role.Instructor)
  instructorEndpoint() {
    return 'Instructor Access Granted';
  }

  @Get('student')
  @Roles(Role.Student)
  studentEndpoint() {
    return 'Student Access Granted';
  }
}
