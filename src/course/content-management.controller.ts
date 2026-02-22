import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  AddCollaboratorDto,
  CreateContentDto,
  CreateContentFromTemplateDto,
  CreateTemplateDto,
  RequestApprovalDto,
  ReviewContentDto,
  TrackContentEngagementDto,
  UpdateContentDto,
} from './dto/content-management.dto';
import { CollaborationRole } from './enums/collaboration-role.enum';
import { ContentFormat } from './enums/content-format.enum';
import { ContentAnalyticsService } from './services/content-analytics.service';
import { ContentApprovalService } from './services/content-approval.service';
import { ContentCollaborationService } from './services/content-collaboration.service';
import { ContentManagementService } from './services/content-management.service';
import { ContentVersioningService } from './services/content-versioning.service';

@Controller('courses/content')
export class ContentManagementController {
  constructor(
    private readonly contentManagementService: ContentManagementService,
    private readonly contentVersioningService: ContentVersioningService,
    private readonly contentCollaborationService: ContentCollaborationService,
    private readonly contentApprovalService: ContentApprovalService,
    private readonly contentAnalyticsService: ContentAnalyticsService,
  ) {}

  @Post()
  createContent(@Body() dto: CreateContentDto) {
    return this.contentManagementService.createContent(dto);
  }

  @Patch(':contentId')
  updateContent(@Param('contentId') contentId: string, @Body() dto: UpdateContentDto) {
    return this.contentManagementService.updateContent(contentId, dto);
  }

  @Get(':contentId')
  getContent(@Param('contentId') contentId: string) {
    return this.contentManagementService.getContentById(contentId);
  }

  @Get('lesson/:lessonId')
  getLessonContents(@Param('lessonId') lessonId: string) {
    return this.contentManagementService.listLessonContents(lessonId);
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.contentManagementService.createTemplate(dto);
  }

  @Get('templates/all')
  listTemplates(@Query('format') format?: ContentFormat) {
    return this.contentManagementService.listTemplates(format);
  }

  @Post('templates/reuse')
  createFromTemplate(@Body() dto: CreateContentFromTemplateDto) {
    return this.contentManagementService.createFromTemplate(dto);
  }

  @Get(':contentId/versions')
  getHistory(@Param('contentId') contentId: string) {
    return this.contentVersioningService.getHistory(contentId);
  }

  @Post(':contentId/versions/:version/restore')
  restoreVersion(
    @Param('contentId') contentId: string,
    @Param('version', ParseIntPipe) version: number,
    @Body('restoredBy') restoredBy?: string,
  ) {
    return this.contentVersioningService.restoreVersion(contentId, version, restoredBy);
  }

  @Get(':contentId/versions/compare')
  compareVersions(
    @Param('contentId') contentId: string,
    @Query('from', ParseIntPipe) fromVersion: number,
    @Query('to', ParseIntPipe) toVersion: number,
  ) {
    return this.contentVersioningService.compareVersions(contentId, fromVersion, toVersion);
  }

  @Post(':contentId/collaborators')
  addCollaborator(@Param('contentId') contentId: string, @Body() dto: AddCollaboratorDto) {
    return this.contentCollaborationService.addCollaborator(contentId, dto);
  }

  @Get(':contentId/collaborators')
  listCollaborators(@Param('contentId') contentId: string) {
    return this.contentCollaborationService.listCollaborators(contentId);
  }

  @Patch(':contentId/collaborators/:userId')
  updateCollaboratorRole(
    @Param('contentId') contentId: string,
    @Param('userId') userId: string,
    @Body('role') role: CollaborationRole,
  ) {
    return this.contentCollaborationService.updateRole(contentId, userId, role);
  }

  @Post(':contentId/collaborators/:userId/remove')
  removeCollaborator(@Param('contentId') contentId: string, @Param('userId') userId: string) {
    return this.contentCollaborationService.removeCollaborator(contentId, userId);
  }

  @Post(':contentId/collaborators/:userId/edit-activity')
  markEditActivity(@Param('contentId') contentId: string, @Param('userId') userId: string) {
    return this.contentCollaborationService.markEditActivity(contentId, userId);
  }

  @Post(':contentId/approval/request')
  requestApproval(@Param('contentId') contentId: string, @Body() dto: RequestApprovalDto) {
    return this.contentApprovalService.requestApproval(contentId, dto.comments);
  }

  @Post(':contentId/approval/review')
  reviewContent(@Param('contentId') contentId: string, @Body() dto: ReviewContentDto) {
    return this.contentApprovalService.reviewContent(contentId, dto);
  }

  @Post(':contentId/publish')
  publishApprovedContent(@Param('contentId') contentId: string) {
    return this.contentApprovalService.publishApprovedContent(contentId);
  }

  @Get(':contentId/approval/history')
  getApprovalHistory(@Param('contentId') contentId: string) {
    return this.contentApprovalService.getApprovalHistory(contentId);
  }

  @Post(':contentId/analytics/track')
  trackEngagement(@Param('contentId') contentId: string, @Body() dto: TrackContentEngagementDto) {
    return this.contentAnalyticsService.trackEngagement(contentId, dto);
  }

  @Get(':contentId/analytics/summary')
  getEngagementSummary(@Param('contentId') contentId: string) {
    return this.contentAnalyticsService.getEngagementSummary(contentId);
  }

  @Get('analytics/top-performing')
  getTopPerforming(@Query('limit') limit?: number) {
    return this.contentAnalyticsService.getTopPerformingContents(limit ? Number(limit) : 10);
  }
}
