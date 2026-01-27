import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';
import { UserRole } from '../auth/entities/user.entity';
import { CurriculumBuilderService } from './services/curriculum-builder.service';
import { AdaptiveLearningService } from './services/adaptive-learning.service';
import { ObjectiveMappingService } from './services/objective-mapping.service';
import { ProgressTrackingService } from './services/progress-tracking.service';
import { TemplateLibraryService } from './services/template-library.service';
import { ExportImportService } from './services/export-import.service';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { UpdateLearningPathDto } from './dto/update-learning-path.dto';

@ApiTags('Learning Paths')
@Controller('learning-paths')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningPathController {
  constructor(
    private readonly curriculumBuilderService: CurriculumBuilderService,
    private readonly adaptiveLearningService: AdaptiveLearningService,
    private readonly objectiveMappingService: ObjectiveMappingService,
    private readonly progressTrackingService: ProgressTrackingService,
    private readonly templateLibraryService: TemplateLibraryService,
    private readonly exportImportService: ExportImportService,
  ) {}

  // Learning Path CRUD Operations
  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new learning path' })
  @ApiResponse({ status: 201, description: 'Learning path created successfully' })
  async create(@Request() req, @Body() createDto: CreateLearningPathDto) {
    return this.curriculumBuilderService.createLearningPath(req.user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all learning paths' })
  @ApiResponse({ status: 200, description: 'List of learning paths' })
  async findAll(
    @Request() req,
    @Query('instructorId') instructorId?: string,
  ) {
    // Instructors can see their own paths, admins can see all
    const canSeeAll = req.user.role === UserRole.ADMIN;
    const filterInstructorId = canSeeAll ? instructorId : req.user.id;
    
    return this.curriculumBuilderService.findAll(filterInstructorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get learning path by ID' })
  @ApiResponse({ status: 200, description: 'Learning path details' })
  async findOne(@Param('id') id: string) {
    return this.curriculumBuilderService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update learning path' })
  @ApiResponse({ status: 200, description: 'Learning path updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLearningPathDto,
  ) {
    return this.curriculumBuilderService.updateLearningPath(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete learning path' })
  @ApiResponse({ status: 200, description: 'Learning path deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.curriculumBuilderService.deleteLearningPath(id);
  }

  // Node Management
  @Post(':id/nodes')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Add node to learning path' })
  @ApiResponse({ status: 201, description: 'Node added successfully' })
  async addNode(
    @Param('id') learningPathId: string,
    @Body() nodeDto: any,
  ) {
    return this.curriculumBuilderService.addNodeToPath(learningPathId, nodeDto);
  }

  @Delete('nodes/:nodeId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Remove node from learning path' })
  @ApiResponse({ status: 200, description: 'Node removed successfully' })
  async removeNode(@Param('nodeId') nodeId: string) {
    return this.curriculumBuilderService.removeNodeFromPath(nodeId);
  }

  // Dependency Management
  @Post('nodes/:nodeId/dependencies')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create dependency between nodes' })
  @ApiResponse({ status: 201, description: 'Dependency created successfully' })
  async createDependency(
    @Param('nodeId') sourceNodeId: string,
    @Body() dependencyDto: any,
  ) {
    return this.curriculumBuilderService.createDependency(sourceNodeId, dependencyDto);
  }

  @Get(':id/dependency-graph')
  @ApiOperation({ summary: 'Get dependency graph for learning path' })
  @ApiResponse({ status: 200, description: 'Dependency graph data' })
  async getDependencyGraph(@Param('id') learningPathId: string) {
    return this.curriculumBuilderService.getDependencyGraph(learningPathId);
  }

  @Get(':id/validate-dependencies')
  @ApiOperation({ summary: 'Validate learning path dependencies' })
  @ApiResponse({ status: 200, description: 'Validation results' })
  async validateDependencies(@Param('id') learningPathId: string) {
    return this.curriculumBuilderService.validateDependencies(learningPathId);
  }

  // Adaptive Learning
  @Get('enrollments/:enrollmentId/next-node')
  @ApiOperation({ summary: 'Get next recommended node for adaptive learning' })
  @ApiResponse({ status: 200, description: 'Recommended node' })
  async getNextRecommendedNode(@Param('enrollmentId') enrollmentId: string) {
    return this.adaptiveLearningService.getNextRecommendedNode(enrollmentId);
  }

  @Get('enrollments/:enrollmentId/performance')
  @ApiOperation({ summary: 'Get student performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  async getPerformanceMetrics(
    @Param('enrollmentId') enrollmentId: string,
  ) {
    const enrollment = await this.progressTrackingService.getUserProgress(
      '', // userId would be extracted from enrollment
      '', // learningPathId would be extracted from enrollment
    );
    return this.adaptiveLearningService.getPerformanceMetrics(
      enrollment.enrollmentId,
      enrollment.enrollmentId, // This needs to be fixed to extract actual IDs
    );
  }

  @Get('enrollments/:enrollmentId/completion-prediction')
  @ApiOperation({ summary: 'Get completion prediction' })
  @ApiResponse({ status: 200, description: 'Completion prediction' })
  async getCompletionPrediction(@Param('enrollmentId') enrollmentId: string) {
    return this.adaptiveLearningService.getPathCompletionPrediction(enrollmentId);
  }

  // Progress Tracking
  @Post('enroll')
  @ApiOperation({ summary: 'Enroll user in learning path' })
  @ApiResponse({ status: 201, description: 'User enrolled successfully' })
  async enrollUser(@Request() req, @Body('learningPathId') learningPathId: string) {
    return this.progressTrackingService.enrollUser(req.user.id, learningPathId);
  }

  @Post('enrollments/:enrollmentId/progress')
  @ApiOperation({ summary: 'Update learning progress' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  async updateProgress(
    @Param('enrollmentId') enrollmentId: string,
    @Body() progressDto: any,
  ) {
    return this.progressTrackingService.updateProgress(enrollmentId, progressDto);
  }

  @Get('users/:userId/progress/:learningPathId')
  @ApiOperation({ summary: 'Get user progress for learning path' })
  @ApiResponse({ status: 200, description: 'User progress details' })
  async getUserProgress(
    @Param('userId') userId: string,
    @Param('learningPathId') learningPathId: string,
  ) {
    return this.progressTrackingService.getUserProgress(userId, learningPathId);
  }

  @Get(':id/analytics')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get learning path analytics' })
  @ApiResponse({ status: 200, description: 'Analytics report' })
  async getAnalytics(
    @Param('id') learningPathId: string,
    @Query('timeframe') timeframe: 'week' | 'month' | 'year' = 'month',
  ) {
    return this.progressTrackingService.getEnrollmentAnalytics(learningPathId, timeframe);
  }

  @Get('users/:userId/history')
  @ApiOperation({ summary: 'Get user learning history' })
  @ApiResponse({ status: 200, description: 'Learning history' })
  async getUserHistory(@Param('userId') userId: string) {
    return this.progressTrackingService.getUserLearningHistory(userId);
  }

  // Learning Objectives
  @Post('objectives')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create learning objective' })
  @ApiResponse({ status: 201, description: 'Learning objective created' })
  async createObjective(@Body() createDto: any) {
    return this.objectiveMappingService.createObjective(createDto);
  }

  @Get('objectives')
  @ApiOperation({ summary: 'Get learning objectives' })
  @ApiResponse({ status: 200, description: 'List of learning objectives' })
  async getObjectives(@Query() filters: any) {
    return this.objectiveMappingService.findAll(filters);
  }

  @Post('nodes/:nodeId/objectives')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Map objectives to node' })
  @ApiResponse({ status: 200, description: 'Objectives mapped successfully' })
  async mapObjectivesToNode(
    @Param('nodeId') nodeId: string,
    @Body('objectiveIds') objectiveIds: string[],
  ) {
    return this.objectiveMappingService.mapObjectivesToNode(nodeId, objectiveIds);
  }

  @Get('nodes/:nodeId/objectives')
  @ApiOperation({ summary: 'Get objectives for node' })
  @ApiResponse({ status: 200, description: 'Node objectives' })
  async getNodeObjectives(@Param('nodeId') nodeId: string) {
    return this.objectiveMappingService.getNodeObjectives(nodeId);
  }

  @Get(':id/objective-coverage')
  @ApiOperation({ summary: 'Get objective coverage report' })
  @ApiResponse({ status: 200, description: 'Coverage report' })
  async getObjectiveCoverage(@Param('id') learningPathId: string) {
    return this.objectiveMappingService.getObjectiveCoverageReport(learningPathId);
  }

  @Get('objectives/:id/suggestions/:nodeId')
  @ApiOperation({ summary: 'Get suggested objectives for node' })
  @ApiResponse({ status: 200, description: 'Suggested objectives' })
  async getSuggestedObjectives(
    @Param('id') objectiveId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.objectiveMappingService.suggestObjectivesForNode(nodeId);
  }

  // Template Library
  @Post('templates')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create learning path template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Request() req, @Body() templateDto: any) {
    return this.templateLibraryService.createTemplate(req.user.id, templateDto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get learning path templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getTemplates(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.templateLibraryService.findAll(category as any, search);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    return this.templateLibraryService.findOne(id);
  }

  @Post('templates/:id/instantiate')
  @ApiOperation({ summary: 'Create learning path from template' })
  @ApiResponse({ status: 201, description: 'Learning path created from template' })
  async instantiateTemplate(
    @Request() req,
    @Param('id') templateId: string,
    @Body() customizations?: any,
  ) {
    return this.templateLibraryService.instantiateTemplate(templateId, req.user.id, customizations);
  }

  @Get('templates/popular')
  @ApiOperation({ summary: 'Get popular templates' })
  @ApiResponse({ status: 200, description: 'Popular templates' })
  async getPopularTemplates(@Query('limit') limit: number = 10) {
    return this.templateLibraryService.getPopularTemplates(limit);
  }

  @Get('templates/category/:category')
  @ApiOperation({ summary: 'Get templates by category' })
  @ApiResponse({ status: 200, description: 'Templates by category' })
  async getTemplatesByCategory(@Param('category') category: string) {
    return this.templateLibraryService.getTemplatesByCategory(category as any);
  }

  @Get('templates/search/:query')
  @ApiOperation({ summary: 'Search templates' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchTemplates(@Param('query') query: string) {
    return this.templateLibraryService.searchTemplates(query);
  }

  @Get('my/templates')
  @ApiOperation({ summary: 'Get my templates' })
  @ApiResponse({ status: 200, description: 'User templates' })
  async getUserTemplates(@Request() req) {
    return this.templateLibraryService.getUserTemplates(req.user.id);
  }

  // Export/Import
  @Get(':id/export')
  @ApiOperation({ summary: 'Export learning path' })
  @ApiResponse({ status: 200, description: 'Exported learning path data' })
  async exportLearningPath(@Param('id') id: string) {
    return this.exportImportService.exportLearningPath(id);
  }

  @Post('import')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Import learning path' })
  @ApiResponse({ status: 201, description: 'Learning path imported successfully' })
  async importLearningPath(@Request() req, @Body() importData: any) {
    return this.exportImportService.importLearningPath(req.user.id, importData);
  }
}