import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ElectiveCourseService } from './elective-course.service';
import { CreateElectiveCourseDto } from './dto/create-elective-course.dto';
import { UpdateElectiveCourseDto } from './dto/update-elective-course.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';

// Standardized response helper
function standardResponse(data: any, message = 'OK') {
  return { status: 'success', message, data };
}

@Controller('elective-courses')
export class ElectiveCourseController {
  constructor(private readonly service: ElectiveCourseService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateElectiveCourseDto) {
    const created = await this.service.createCourse(dto);
    return standardResponse(created, 'Elective course created');
  }

  @Get()
  @Public()
  async findAll(@Query('category') category?: string, @Query('isActive') isActive?: string) {
    // Service currently supports simple fetch; apply basic filter on returned list
    const all = await this.service.getAllCourses();
    let filtered = all;
    if (category) {
      filtered = filtered.filter((c) => (c as any).category === category);
    }
    if (isActive !== undefined) {
      const flag = isActive === 'true' || isActive === '1';
      filtered = filtered.filter((c) => ((c as any).isActive ?? true) === flag);
    }
    return standardResponse(filtered, 'Elective courses retrieved');
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    const found = await this.service.getCourseById(id);
    if (!found) throw new NotFoundException('Elective course not found');
    return standardResponse(found, 'Elective course retrieved');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateElectiveCourseDto) {
    const updated = await this.service.updateCourse(id, dto);
    return standardResponse(updated, 'Elective course updated');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.service.deleteCourse(id);
    return standardResponse(null, 'Elective course deleted');
  }
}
