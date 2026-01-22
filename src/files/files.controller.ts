import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import type { File } from 'multer';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  uploadFile(
    @UploadedFile() file: File,
    @Req() req,
  ) {
    return this.filesService.upload(file, req.user.id);
  }

  @Get(':id')
  getFile(@Param('id') id: string, @Req() req) {
    return this.filesService.getFile(id, req.user.id);
  }

  @Delete(':id')
  deleteFile(@Param('id') id: string, @Req() req) {
    return this.filesService.deleteFile(id, req.user.id);
  }
}
