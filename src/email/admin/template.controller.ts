import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { EmailTemplateService } from './template.service';
import { EmailTemplate } from '../entities/email-template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@Controller('admin/email-templates')
export class EmailTemplateController {
  constructor(private readonly templateService: EmailTemplateService) {}

  @Get()
  findAll(): Promise<EmailTemplate[]> {
    return this.templateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<EmailTemplate> {
    return this.templateService.findOne(id);
  }

  @Post()
  create(@Body() createTemplateDto: CreateTemplateDto): Promise<EmailTemplate> {
    return this.templateService.create(createTemplateDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<EmailTemplate> {
    return this.templateService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.templateService.remove(id);
  }
}
