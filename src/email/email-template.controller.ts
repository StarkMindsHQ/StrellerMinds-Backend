import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { EmailTemplateService } from './email-template.service';
import {
  CreateAbTestDto,
  CreateTemplateDto,
  CreateTemplateVersionDto,
  PublishVersionDto,
  RenderTemplateDto,
  RollbackVersionDto,
  TemplateAnalyticsQueryDto,
  TestSendDto,
  UpdateTemplateDto,
} from './dto/email-template.dto';
import { TemplateEventType } from './entities/template-analytics-event.entity';

@ApiTags('Email Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('email-templates')
export class EmailTemplateController {
  constructor(private readonly svc: EmailTemplateService) {}

  // ─── Template CRUD ────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create template' })
  async create(@Body() dto: CreateTemplateDto, @Request() req) {
    return { success: true, data: await this.svc.createTemplate(dto, req.user.id) };
  }

  @Get()
  @ApiOperation({ summary: 'List templates' })
  async list(@Query() query: any) {
    return { success: true, data: await this.svc.listTemplates(query) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  async get(@Param('id') id: string) {
    return { success: true, data: await this.svc.getTemplate(id) };
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get template by slug' })
  async getBySlug(@Param('slug') slug: string) {
    return { success: true, data: await this.svc.getTemplateBySlug(slug) };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update template' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @Request() req) {
    return { success: true, data: await this.svc.updateTemplate(id, dto, req.user.id) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive template' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@Param('id') id: string) {
    await this.svc.archiveTemplate(id);
  }

  // ─── Versions ─────────────────────────────────────────────────────────────

  @Post(':id/versions')
  @ApiOperation({ summary: 'Create new template version' })
  async createVersion(
    @Param('id') id: string,
    @Body() dto: CreateTemplateVersionDto,
    @Request() req,
  ) {
    return { success: true, data: await this.svc.createVersion(id, dto, req.user.id) };
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List all versions' })
  async listVersions(@Param('id') id: string, @Query('locale') locale?: string) {
    return { success: true, data: await this.svc.listVersions(id, locale) };
  }

  @Post(':id/versions/publish')
  @ApiOperation({ summary: 'Publish a specific version' })
  async publishVersion(@Param('id') id: string, @Body() dto: PublishVersionDto) {
    return { success: true, data: await this.svc.publishVersion(id, dto) };
  }

  @Post(':id/versions/rollback')
  @ApiOperation({ summary: 'Rollback to a previous version' })
  async rollback(@Param('id') id: string, @Body() dto: RollbackVersionDto, @Request() req) {
    return { success: true, data: await this.svc.rollbackVersion(id, dto, req.user.id) };
  }

  @Get(':id/versions/diff')
  @ApiOperation({ summary: 'Diff two versions' })
  async diff(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('locale') locale = 'en',
  ) {
    return {
      success: true,
      data: await this.svc.diffVersions(id, Number(from), Number(to), locale),
    };
  }

  @Get(':id/versions/:version/preview')
  @ApiOperation({ summary: 'Preview a version with test variables' })
  async preview(
    @Param('id') id: string,
    @Param('version') version: string,
    @Query('locale') locale = 'en',
    @Body() body: { variables: Record<string, any> },
  ) {
    return {
      success: true,
      data: await this.svc.previewTemplate(id, Number(version), locale, body?.variables ?? {}),
    };
  }

  // ─── Rendering & Test Send ────────────────────────────────────────────────

  @Post('render')
  @ApiOperation({ summary: 'Render a template with variables' })
  async render(@Body() dto: RenderTemplateDto) {
    return { success: true, data: await this.svc.render(dto) };
  }

  @Post('test-send')
  @ApiOperation({ summary: 'Render and preview a test send (no actual email)' })
  async testSend(@Body() dto: TestSendDto) {
    return { success: true, data: await this.svc.testSend(dto) };
  }

  // ─── A/B Tests ────────────────────────────────────────────────────────────

  @Post(':id/ab-tests')
  @ApiOperation({ summary: 'Create A/B test' })
  async createAbTest(@Param('id') id: string, @Body() dto: CreateAbTestDto, @Request() req) {
    return { success: true, data: await this.svc.createAbTest(id, dto, req.user.id) };
  }

  @Get(':id/ab-tests')
  @ApiOperation({ summary: 'List A/B tests for template' })
  async listAbTests(@Param('id') id: string) {
    return { success: true, data: await this.svc.listAbTests(id) };
  }

  @Post(':id/ab-tests/:testId/start')
  @ApiOperation({ summary: 'Start an A/B test' })
  async startAbTest(@Param('id') id: string, @Param('testId') testId: string) {
    return { success: true, data: await this.svc.startAbTest(testId, id) };
  }

  @Post(':id/ab-tests/:testId/stop')
  @ApiOperation({ summary: 'Stop an A/B test and declare winner' })
  async stopAbTest(
    @Param('id') id: string,
    @Param('testId') testId: string,
    @Body() body: { winnerId?: string },
  ) {
    return { success: true, data: await this.svc.stopAbTest(testId, id, body?.winnerId) };
  }

  @Get(':id/ab-tests/:testId/results')
  @ApiOperation({ summary: 'Get A/B test results' })
  async abTestResults(@Param('id') id: string, @Param('testId') testId: string) {
    return { success: true, data: await this.svc.getAbTestResults(testId, id) };
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get template performance analytics' })
  async analytics(@Param('id') id: string, @Query() query: TemplateAnalyticsQueryDto) {
    return { success: true, data: await this.svc.getPerformance(id, query) };
  }

  @Post(':id/analytics/track')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track a template analytics event (webhook endpoint)' })
  async trackEvent(
    @Param('id') id: string,
    @Body()
    body: {
      templateVersionId: string;
      recipientId: string;
      recipientEmail: string;
      eventType: TemplateEventType;
      abTestId?: string;
      variantId?: string;
      locale?: string;
      clickedUrl?: string;
    },
  ) {
    await this.svc.trackEvent(
      id,
      body.templateVersionId,
      body.recipientId,
      body.recipientEmail,
      body.eventType,
      {
        abTestId: body.abTestId,
        variantId: body.variantId,
        locale: body.locale,
        clickedUrl: body.clickedUrl,
      },
    );
  }
}
