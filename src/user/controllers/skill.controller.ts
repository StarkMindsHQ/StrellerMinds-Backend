import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SkillService } from '../services/skill.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../../auth/guards/auth.guard';
import { UserRole } from '../../auth/entities/user.entity';
import {
  CreateSkillDto,
  UpdateSkillDto,
  CreateUserSkillDto,
  UpdateUserSkillDto,
  CreateSkillEndorsementDto,
  CreateSkillAssessmentDto,
  SubmitAssessmentDto,
} from '../dto/skill.dto';

@ApiTags('Skills')
@Controller('skills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  // Skill Management (Admin only)
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new skill' })
  @ApiResponse({ status: 201, description: 'Skill created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createSkill(@Body() createDto: CreateSkillDto) {
    return this.skillService.createSkill(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all skills' })
  @ApiResponse({ status: 200, description: 'Skills retrieved successfully' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllSkills(
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.skillService.getAllSkills(category, page || 1, limit || 20);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search skills' })
  @ApiResponse({ status: 200, description: 'Skills found' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchSkills(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.skillService.searchSkills(query, page || 1, limit || 20);
  }

  @Get(':skillId')
  @ApiOperation({ summary: 'Get skill by ID' })
  @ApiResponse({ status: 200, description: 'Skill found' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async getSkillById(@Param('skillId') skillId: string) {
    return this.skillService.getSkillById(skillId);
  }

  @Put(':skillId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a skill' })
  @ApiResponse({ status: 200, description: 'Skill updated successfully' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async updateSkill(@Param('skillId') skillId: string, @Body() updateDto: UpdateSkillDto) {
    return this.skillService.updateSkill(skillId, updateDto);
  }

  @Delete(':skillId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a skill (soft delete)' })
  @ApiResponse({ status: 204, description: 'Skill deleted successfully' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async deleteSkill(@Param('skillId') skillId: string) {
    await this.skillService.deleteSkill(skillId);
  }

  // User Skills
  @Post('user')
  @ApiOperation({ summary: 'Add a skill to user profile' })
  @ApiResponse({ status: 201, description: 'Skill added successfully' })
  async addUserSkill(@Request() req, @Body() createDto: CreateUserSkillDto) {
    const profile = await this.getProfileFromRequest(req);
    return this.skillService.addUserSkill(profile.id, createDto);
  }

  @Get('user/me')
  @ApiOperation({ summary: 'Get current user skills' })
  @ApiResponse({ status: 200, description: 'User skills retrieved' })
  async getMySkills(@Request() req) {
    const profile = await this.getProfileFromRequest(req);
    return this.skillService.getUserSkills(profile.id, true);
  }

  @Get('user/:profileId')
  @ApiOperation({ summary: 'Get user skills by profile ID' })
  @ApiResponse({ status: 200, description: 'User skills retrieved' })
  async getUserSkills(@Param('profileId') profileId: string) {
    return this.skillService.getUserSkills(profileId, false);
  }

  @Put('user/:userSkillId')
  @ApiOperation({ summary: 'Update user skill' })
  @ApiResponse({ status: 200, description: 'User skill updated' })
  async updateUserSkill(
    @Request() req,
    @Param('userSkillId') userSkillId: string,
    @Body() updateDto: UpdateUserSkillDto,
  ) {
    const profile = await this.getProfileFromRequest(req);
    return this.skillService.updateUserSkill(userSkillId, profile.id, updateDto);
  }

  @Delete('user/:userSkillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove user skill' })
  @ApiResponse({ status: 204, description: 'User skill removed' })
  async removeUserSkill(@Request() req, @Param('userSkillId') userSkillId: string) {
    const profile = await this.getProfileFromRequest(req);
    await this.skillService.removeUserSkill(userSkillId, profile.id);
  }

  // Skill Endorsements
  @Post('endorsements')
  @ApiOperation({ summary: 'Create a skill endorsement' })
  @ApiResponse({ status: 201, description: 'Endorsement created' })
  async createEndorsement(@Request() req, @Body() createDto: CreateSkillEndorsementDto) {
    const profile = await this.getProfileFromRequest(req);
    return this.skillService.createEndorsement(profile.id, createDto);
  }

  @Get('endorsements/:userSkillId')
  @ApiOperation({ summary: 'Get endorsements for a skill' })
  @ApiResponse({ status: 200, description: 'Endorsements retrieved' })
  async getSkillEndorsements(@Param('userSkillId') userSkillId: string) {
    return this.skillService.getSkillEndorsements(userSkillId);
  }

  @Delete('endorsements/:endorsementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an endorsement' })
  @ApiResponse({ status: 204, description: 'Endorsement removed' })
  async removeEndorsement(@Request() req, @Param('endorsementId') endorsementId: string) {
    const profile = await this.getProfileFromRequest(req);
    await this.skillService.removeEndorsement(endorsementId, profile.id);
  }

  // Skill Assessments (Admin only)
  @Post('assessments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a skill assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  async createAssessment(@Body() createDto: CreateSkillAssessmentDto) {
    return this.skillService.createAssessment(createDto);
  }

  @Get('assessments/skill/:skillId')
  @ApiOperation({ summary: 'Get assessments by skill' })
  @ApiResponse({ status: 200, description: 'Assessments retrieved' })
  async getAssessmentsBySkill(@Param('skillId') skillId: string) {
    return this.skillService.getAssessmentsBySkill(skillId);
  }

  @Get('assessments/:assessmentId')
  @ApiOperation({ summary: 'Get assessment by ID' })
  @ApiResponse({ status: 200, description: 'Assessment found' })
  async getAssessmentById(@Param('assessmentId') assessmentId: string) {
    return this.skillService.getAssessmentById(assessmentId);
  }

  @Post('assessments/submit')
  @ApiOperation({ summary: 'Submit an assessment' })
  @ApiResponse({ status: 201, description: 'Assessment submitted' })
  async submitAssessment(@Request() req, @Body() submitDto: SubmitAssessmentDto) {
    const profile = await this.getProfileFromRequest(req);
    return this.skillService.submitAssessment(profile.id, submitDto);
  }

  @Get('assessments/results/me')
  @ApiOperation({ summary: 'Get my assessment results' })
  @ApiResponse({ status: 200, description: 'Results retrieved' })
  async getMyAssessmentResults(@Request() req) {
    const profile = await this.getProfileFromRequest(req);
    return this.skillService.getUserAssessmentResults(profile.id);
  }

  // Statistics
  @Get('stats/me')
  @ApiOperation({ summary: 'Get my skill statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getMySkillStats(@Request() req) {
    const profile = await this.getProfileFromRequest(req);
    return this.skillService.getUserSkillStats(profile.id);
  }

  @Get('stats/:profileId')
  @ApiOperation({ summary: 'Get user skill statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getUserSkillStats(@Param('profileId') profileId: string) {
    return this.skillService.getUserSkillStats(profileId);
  }

  private async getProfileFromRequest(req: any) {
    // This assumes the profile is attached to the request by an interceptor or guard
    // You may need to adjust this based on your auth implementation
    return req.user.profile || req.user;
  }
}
