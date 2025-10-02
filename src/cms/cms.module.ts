import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { Content } from './entity/content.entity';
import { ContentVersion } from './entity/content-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Content, ContentVersion])],
  controllers: [CmsController],
  providers: [CmsService],
})
export class CmsModule {}
