import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dtos/create.course.dto';
import { UpdateCourseDto } from './dtos/update.course.dto';
import { EmailService } from 'src/email/email.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    private readonly emailService: EmailService,
    private readonly userService: UsersService,
  ) {}

  public async create(createCourseDto: CreateCourseDto): Promise<Course> {
    try {
      const course = this.courseRepository.create({
        ...createCourseDto,
        modules: Promise.resolve(createCourseDto.modules || []),
        tags: Promise.resolve(
          createCourseDto.tagIds?.map((id) => ({ id })) || [],
        ),
      });

      const user = await this.userService.findOne(createCourseDto.instructorId);

      // Send enrollment confirmation email
      await this.emailService.sendCourseEnrollmentEmail(user, course);

      return await this.courseRepository.save(course);
    } catch (error) {
      throw new InternalServerErrorException('Error creating course');
    }
  }

  public async findAll(): Promise<Course[]> {
    try {
      return await this.courseRepository.find();
    } catch (error) {
      throw new InternalServerErrorException('Error fetching courses');
    }
  }

  public async findOne(id: string): Promise<Course> {
    try {
      const course = await this.courseRepository.findOne({ where: { id } });
      if (!course) {
        throw new NotFoundException(`Course with ID ${id} not found`);
      }
      return course;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching course');
    }
  }

  public async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
  ): Promise<void> {
    try {
      await this.findOne(id);
      const updateData = {
        ...updateCourseDto,
        modules: updateCourseDto.modules
          ? Promise.resolve(updateCourseDto.modules)
          : undefined,
        tags: updateCourseDto.tagIds
          ? Promise.resolve(updateCourseDto.tagIds.map((id) => ({ id })))
          : undefined,
      };
      await this.courseRepository.update(id, updateData);
    } catch (error) {
      throw new InternalServerErrorException('Error updating course');
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const result = await this.courseRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Course with ID ${id} not found`);
      }
    } catch (error) {
      throw new InternalServerErrorException('Error deleting course');
    }
  }
}
