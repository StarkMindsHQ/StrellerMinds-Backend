import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { EmailTestService } from '../utils/test.util';

@Controller('admin/email-preview')
export class EmailPreviewController {
  constructor(private readonly emailTestService: EmailTestService) {}

  @Get(':templateName')
  async previewTemplate(
    @Param('templateName') templateName: string,
    @Query() context: Record<string, any>,
  ) {
    return this.emailTestService.generatePreview(templateName, context);
  }

  @Post('validate')
  async validateTemplate(
    @Body() body: { templateName: string; context: Record<string, any> },
  ) {
    return this.emailTestService.validateTemplate(
      body.templateName,
      body.context,
    );
  }

  @Post('test')
  async testTemplate(
    @Body()
    body: {
      templateName: string;
      email: string;
      context: Record<string, any>;
    },
  ) {
    return this.emailTestService.testTemplate(
      body.templateName,
      body.email,
      body.context,
    );
  }
}
