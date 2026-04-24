import { Module } from '@nestjs/common';
import { FileUploadSecurityService } from './services/file-upload-security.service';

@Module({
  providers: [FileUploadSecurityService],
  exports: [FileUploadSecurityService],
})
export class CommonSecurityModule {}
