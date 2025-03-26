/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UpdateCategoryDto } from 'src/courses/dtos/update.category.dto';
import { CreateForumCategoryDto } from 'src/forum/dto/create-forum-category.dto';
import { Request } from 'express';
import { ForumCategoryService } from './catogory.service';

// Category Controller
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: ForumCategoryService) {}

  @Post()
  @UseGuards(AuthGuard('jwt')) // Specify strategy
  async createCategory(
    @Body() createCategoryDto: CreateForumCategoryDto,
    @Req() req: Request, // Use @Req() to access request
  ) {
    return this.categoryService.createCategory(createCategoryDto);
  }

  @Get()
  async findAllCategories(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.categoryService.findAllCategories(page, limit);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.updateCategory(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
