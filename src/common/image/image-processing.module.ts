import { Global, Module } from '@nestjs/common';
import { ImageProcessingService } from './image-processing.service';

@Global()
@Module({
  providers: [ImageProcessingService],
  exports: [ImageProcessingService],
})
export class ImageProcessingModule {}
