import { Controller, Post, Body, Param, Patch, Get } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Post(':authorId')
  create(@Param('authorId') authorId: string, @Body() dto: CreateContentDto) {
    return this.cmsService.create(dto, authorId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.cmsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.cmsService.updateStatus(id, dto);
  }

  @Get(':id/versions')
  versions(@Param('id') id: string) {
    return this.cmsService.findVersions(id);
  }
}