import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';

/**
 * Profile module for managing user profile images.
 */
@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [ProfileController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class ProfileModule {}
