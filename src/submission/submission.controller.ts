// src/submission/submission.controller.ts
import {
    Controller, Post, Body, Get, Param, UploadedFile, UseInterceptors, Patch, UseGuards
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { extname } from 'path';
import { SubmissionService } from './provider/submission.service';
import { CreateSubmissionDto } from './dtos/createSubmission.dto';
  
  @Controller('submissions')
  export class SubmissionController {
    constructor(private readonly submissionService: SubmissionService) {}
  
    @Post()
    @UseInterceptors(FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_, file, cb) => {
          cb(null, `${Date.now()}${extname(file.originalname)}`);
        },
      }),
    }))
    create(
      @Body() createDto: CreateSubmissionDto,
      @UploadedFile() file: Express.Multer.File,
    ) {
      return this.submissionService.create(createDto, file);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.submissionService.findOne(id);
    }
  
    @Patch(':id')
    @UseInterceptors(FileInterceptor('file'))
    update(
      @Param('id') id: string,
      @Body() updateDto: Partial<CreateSubmissionDto>,
      @UploadedFile() file?: Express.Multer.File,
    ) {
      return this.submissionService.update(id, updateDto, file);
    }
  }  