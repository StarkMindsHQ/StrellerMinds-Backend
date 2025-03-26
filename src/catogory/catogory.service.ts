import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateForumCategoryDto } from 'src/forum/dto/create-forum-category.dto'; // Correct import
import { UpdateCategoryDto } from 'src/courses/dtos/update.category.dto';
import { Repository } from 'typeorm';
import { ForumCategory } from './entities/forum-category.entity';

@Injectable()
export class ForumCategoryService {
  constructor(
    @InjectRepository(ForumCategory)
    private categoryRepository: Repository<ForumCategory>,
  ) {}

  async createCategory(
    createCategoryDto: CreateForumCategoryDto, // Correct DTO usage
  ): Promise<ForumCategory> {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  async findAllCategories(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    categories: ForumCategory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [categories, total] = await this.categoryRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['creator'],
    });

    return {
      categories,
      total,
      page,
      limit,
    };
  }

  async updateCategory(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ForumCategory | null> {
    await this.categoryRepository.update(id, updateCategoryDto);
    return this.categoryRepository.findOne({
      where: { id },
      relations: ['creator'],
    });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.categoryRepository.delete(id);
  }
}
