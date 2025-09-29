import { Module } from '@nestjs/common';
import { ModuleController } from './module.controller';
import { ModuleService } from './module.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module as ModuleEntity } from './entities/module.entity';
import { Lesson } from 'src/lesson/entity/lesson.entity';
import { ApiTags } from '@nestjs/swagger';

/**
 * Module for managing course modules and their lessons.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ModuleEntity, ModuleEntity])],
  controllers: [ModuleController],
  providers: [ModuleService],
  exports: [ModuleService],
})
export class ModuleModule {}
