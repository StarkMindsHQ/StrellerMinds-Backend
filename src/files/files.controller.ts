import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
  Get,
  Param,
  Delete,
  Body,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return this.filesService.upload(file, req.user.id);
  }

  @Post('upload-chunk')
  @UseInterceptors(FileInterceptor('file'))
  uploadChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body('uploadId') uploadId: string,
    @Body('chunkIndex') chunkIndex: number,
  ) {
    return this.filesService.uploadChunk(file, uploadId, chunkIndex);
  }

  @Post('complete-upload')
  completeUpload(
    @Body('uploadId') uploadId: string,
    @Body('totalChunks') totalChunks: number,
    @Body('originalname') originalname: string,
    @Body('mimetype') mimetype: string,
    @Req() req,
  ) {
    return this.filesService.assembleUpload(
      uploadId,
      totalChunks,
      originalname,
      mimetype,
      req.user.id,
    );
  }

  @Get(':id')
  getFile(@Param('id') id: string, @Req() req) {
    return this.filesService.getFile(id, req.user.id);
  }

  @Delete(':id')
  deleteFile(@Param('id') id: string, @Req() req) {
    return this.filesService.deleteFile(id, req.user.id);
  }

  @Post(':id/share')
  shareFile(@Param('id') id: string, @Body('targetUserId') targetUserId: string, @Req() req) {
    return this.filesService.shareFile(id, req.user.id, targetUserId);
  }

  @Put(':id/public')
  setPublic(@Param('id') id: string, @Body('isPublic') isPublic: boolean, @Req() req) {
    return this.filesService.setPublic(id, req.user.id, isPublic);
  }
}
