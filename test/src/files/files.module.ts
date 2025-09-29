/**
 * FilesModule provides file management features.
 *
 * @module Files
 */
import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [CloudinaryModule, SharedModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
