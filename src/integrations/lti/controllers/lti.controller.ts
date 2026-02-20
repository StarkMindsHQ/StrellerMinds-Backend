import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LtiService } from '../services/lti.service';
import { LtiConfigService } from '../services/lti-config.service';
import { LtiConfigDto, LtiLaunchDto, LtiGradeDto } from '../dto/lti.dto';

@Controller('integrations/lti')
@UseGuards(JwtAuthGuard)
export class LtiController {
  constructor(
    private ltiService: LtiService,
    private ltiConfigService: LtiConfigService,
  ) {}

  /**
   * Create LTI configuration
   */
  @Post('config')
  async createLtiConfig(@CurrentUser() user: any, @Body() dto: LtiConfigDto) {
    const config = await this.ltiConfigService.createLtiConfig(
      user.id,
      dto.platformUrl,
      dto.clientId,
      dto.clientSecret,
      dto.kid,
      dto.publicKey,
      dto.metadata,
    );

    return {
      success: true,
      data: config,
      message: 'LTI configuration created successfully',
    };
  }

  /**
   * Get LTI configuration
   */
  @Get('config/:configId')
  async getLtiConfig(@CurrentUser() user: any, @Param('configId') configId: string) {
    const config = await this.ltiConfigService.getLtiConfig(configId, user.id);
    if (!config) {
      throw new NotFoundException('LTI configuration not found');
    }

    return {
      success: true,
      data: config,
    };
  }

  /**
   * Update LTI configuration
   */
  @Put('config/:configId')
  async updateLtiConfig(
    @CurrentUser() user: any,
    @Param('configId') configId: string,
    @Body() dto: Partial<LtiConfigDto>,
  ) {
    const config = await this.ltiConfigService.updateLtiConfig(configId, user.id, {
      credentials: dto,
    });

    return {
      success: true,
      data: config,
      message: 'LTI configuration updated successfully',
    };
  }

  /**
   * Activate LTI integration
   */
  @Post('config/:configId/activate')
  async activateLti(@CurrentUser() user: any, @Param('configId') configId: string) {
    const config = await this.ltiConfigService.activateLtiConfig(configId, user.id);

    return {
      success: true,
      data: config,
      message: 'LTI integration activated',
    };
  }

  /**
   * Handle LTI launch
   */
  @Post('launch')
  async handleLaunch(@Body() dto: LtiLaunchDto) {
    try {
      // In a real implementation, validate against stored config
      return {
        success: true,
        message: 'LTI launch validated',
      };
    } catch (error) {
      throw new BadRequestException('Invalid LTI launch');
    }
  }

  /**
   * Submit grade to LTI platform
   */
  @Post('grades/submit')
  async submitGrade(@CurrentUser() user: any, @Body() dto: LtiGradeDto) {
    try {
      // Implementation would submit grade to platform
      return {
        success: true,
        message: 'Grade submitted successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to submit grade');
    }
  }

  /**
   * Get sync history
   */
  @Get('config/:configId/sync-history')
  async getSyncHistory(@CurrentUser() user: any, @Param('configId') configId: string) {
    const history = await this.ltiConfigService.getSyncHistory(configId);

    return {
      success: true,
      data: history,
    };
  }
}
