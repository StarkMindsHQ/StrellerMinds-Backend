import { Module } from '@nestjs/common';
import { ForumCategoryService } from './catogory.service';
import { CategoryController } from './catogory.controller';

@Module({
  controllers: [CategoryController],
  providers: [ForumCategoryService],
  exports: [ForumCategoryService],
})
export class CatogoryModule {}
