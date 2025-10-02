import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service';
import { CreateUserPreferencesDto } from './dtos/create-user-preferences.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('preferences')
export class UserPreferencesController {
  constructor(private readonly preferencesService: UserPreferencesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Req() req, @Body() dto: CreateUserPreferencesDto) {
    try {
      // const userId = req.user.id;
      const userId = req.body.userId || req.user?.id;
      return await this.preferencesService.create(userId, dto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Failed to create preferences',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId')
  async get(@Param('userId') userId: string) {
    try {
      return await this.preferencesService.findByUserId(userId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Preferences not found',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put(':userId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('userId') userId: string, @Body() dto: CreateUserPreferencesDto) {
    try {
      return await this.preferencesService.update(userId, dto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Failed to update preferences',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId/learning-path')
  async getLearningPath(@Param('userId') userId: string) {
    try {
      return await this.preferencesService.getCustomizedLearningPath(userId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Failed to get learning path',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
