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
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { Request, Response } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import { SdkGeneratorService } from '../services/sdk-generator.service';
import { ApiAnalyticsService } from '../services/api-analytics.service';
import { ApiVersioningService } from '../services/api-versioning.service';
import { ApiExplorerService } from '../services/api-explorer.service';
import { ApiTestingService } from '../services/api-testing.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from '../dto/api-key.dto';
import { GenerateSdkDto } from '../dto/sdk.dto';
import { ApiAnalyticsQueryDto } from '../dto/analytics.dto';
import { NestApplication } from '@nestjs/core';

@ApiTags('Developer Portal')
@Controller('documentation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentationController {
  constructor(
    private apiKeyService: ApiKeyService,
    private sdkGenerator: SdkGeneratorService,
    private analyticsService: ApiAnalyticsService,
    private versioningService: ApiVersioningService,
    private explorerService: ApiExplorerService,
    private testingService: ApiTestingService,
  ) {}

  // API Key Management
  @Post('api-keys')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async createApiKey(@Req() req: any, @Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.createApiKey(req.user.id, dto);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'Get all API keys for current user' })
  @ApiResponse({ status: 200, description: 'API keys retrieved' })
  async getApiKeys(@Req() req: any) {
    return this.apiKeyService.getUserApiKeys(req.user.id);
  }

  @Get('api-keys/:id')
  @ApiOperation({ summary: 'Get API key by ID' })
  @ApiResponse({ status: 200, description: 'API key retrieved' })
  async getApiKey(@Req() req: any, @Param('id') id: string) {
    return this.apiKeyService.getApiKey(id, req.user.id);
  }

  @Put('api-keys/:id')
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, description: 'API key updated' })
  async updateApiKey(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
    return this.apiKeyService.updateApiKey(id, req.user.id, dto);
  }

  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: 204, description: 'API key revoked' })
  async revokeApiKey(@Req() req: any, @Param('id') id: string) {
    await this.apiKeyService.revokeApiKey(id, req.user.id);
  }

  // SDK Generation
  @Post('sdks/generate')
  @ApiOperation({ summary: 'Generate SDK for a programming language' })
  @ApiResponse({ status: 201, description: 'SDK generation started' })
  async generateSdk(@Req() req: any, @Body() dto: GenerateSdkDto, @Res() res: Response) {
    // Note: app needs to be injected or accessed differently
    // For now, we'll return a placeholder
    res.status(202).json({
      message: 'SDK generation started',
      language: dto.language,
      version: dto.version || 'v1',
    });
  }

  @Get('sdks')
  @ApiOperation({ summary: 'Get available SDKs' })
  @ApiResponse({ status: 200, description: 'SDKs retrieved' })
  async getSdks(@Query('language') language?: string) {
    // Return available SDKs
    return {
      sdks: [
        { language: 'typescript', version: 'v1', status: 'ready' },
        { language: 'python', version: 'v1', status: 'ready' },
        { language: 'javascript', version: 'v1', status: 'ready' },
      ],
    };
  }

  @Get('sdks/:id/download')
  @ApiOperation({ summary: 'Download SDK' })
  @ApiResponse({ status: 200, description: 'SDK file' })
  async downloadSdk(@Param('id') id: string, @Res() res: Response) {
    const sdk = await this.sdkGenerator.getSdk(id);
    if (!sdk || !sdk.filePath) {
      return res.status(404).json({ message: 'SDK not found' });
    }

    await this.sdkGenerator.incrementDownloadCount(id);
    // In production, serve the file
    res.json({ message: 'SDK download', sdkId: id });
  }

  // API Analytics
  @Get('analytics')
  @ApiOperation({ summary: 'Get API analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getAnalytics(@Query() query: ApiAnalyticsQueryDto) {
    return this.analyticsService.getAnalytics(query);
  }

  @Get('analytics/endpoints/:endpoint')
  @ApiOperation({ summary: 'Get endpoint-specific analytics' })
  @ApiQuery({ name: 'method', required: true })
  @ApiResponse({ status: 200, description: 'Endpoint analytics retrieved' })
  async getEndpointAnalytics(
    @Param('endpoint') endpoint: string,
    @Query('method') method: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getEndpointAnalytics(endpoint, method, {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    });
  }

  // API Versioning
  @Get('versions')
  @ApiOperation({ summary: 'Get all API versions' })
  @ApiResponse({ status: 200, description: 'Versions retrieved' })
  async getVersions() {
    return this.versioningService.getAllVersions();
  }

  @Get('versions/current')
  @ApiOperation({ summary: 'Get current API version' })
  @ApiResponse({ status: 200, description: 'Current version retrieved' })
  async getCurrentVersion() {
    return this.versioningService.getCurrentVersion();
  }

  @Get('versions/:id')
  @ApiOperation({ summary: 'Get version by ID' })
  @ApiResponse({ status: 200, description: 'Version retrieved' })
  async getVersion(@Param('id') id: string) {
    return this.versioningService.getVersion(id);
  }

  @Get('versions/migration/:from/:to')
  @ApiOperation({ summary: 'Get migration guide between versions' })
  @ApiResponse({ status: 200, description: 'Migration guide retrieved' })
  async getMigrationGuide(@Param('from') from: string, @Param('to') to: string) {
    return {
      guide: await this.versioningService.generateMigrationGuide(from, to),
    };
  }

  @Get('endpoints/deprecated')
  @ApiOperation({ summary: 'Get deprecated endpoints' })
  @ApiResponse({ status: 200, description: 'Deprecated endpoints retrieved' })
  async getDeprecatedEndpoints(@Query('versionId') versionId?: string) {
    return this.versioningService.getDeprecatedEndpoints(versionId);
  }

  // API Explorer
  @Get('explorer/spec')
  @ApiOperation({ summary: 'Get OpenAPI specification' })
  @ApiResponse({ status: 200, description: 'OpenAPI spec retrieved' })
  async getOpenApiSpec(@Req() req: any) {
    // Note: Need app instance - would need to be injected
    return { message: 'OpenAPI spec available at /api/docs-json' };
  }

  @Get('explorer/endpoints/:path')
  @ApiOperation({ summary: 'Get endpoint details with examples' })
  @ApiQuery({ name: 'method', required: true })
  @ApiResponse({ status: 200, description: 'Endpoint details retrieved' })
  async getEndpointDetails(
    @Param('path') path: string,
    @Query('method') method: string,
    @Req() req: any,
  ) {
    // Note: Need app instance and spec
    return {
      method,
      path: `/${path}`,
      examples: this.explorerService.generateCodeExamples(
        method,
        `/${path}`,
        'https://api.strellerminds.com',
      ),
    };
  }

  // API Testing
  @Post('testing/run')
  @ApiOperation({ summary: 'Run API test suite' })
  @ApiResponse({ status: 200, description: 'Test suite executed' })
  async runTestSuite(@Body() suite: any) {
    return this.testingService.runTestSuite(suite);
  }

  @Post('testing/generate')
  @ApiOperation({ summary: 'Generate test suite from OpenAPI spec' })
  @ApiResponse({ status: 200, description: 'Test suite generated' })
  async generateTestSuite(@Body() body: { baseUrl: string; spec?: any }) {
    if (body.spec) {
      return this.testingService.generateTestSuiteFromOpenApi(body.spec, body.baseUrl);
    }
    return { message: 'Provide OpenAPI spec to generate tests' };
  }
}
