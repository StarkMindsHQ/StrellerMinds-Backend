import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import type {
  CacheOptimizationService,
  CacheStrategy,
} from '../services/cache-optimization.service';

@ApiTags('Cache Management')
@Controller('pwa/cache')
export class CacheController {
  constructor(private readonly cacheOptimizationService: CacheOptimizationService) {}

  @Post('policy')
  @ApiOperation({ summary: 'Create cache policy' })
  @ApiResponse({ status: 201, description: 'Cache policy created successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createCachePolicy(policyData: {
    route: string;
    method?: string;
    strategy: CacheStrategy;
    maxAge?: number;
    staleWhileRevalidate?: number;
    headers?: Record<string, string>;
    conditions?: any;
    priority?: number;
    description?: string;
  }) {
    const policy = await this.cacheOptimizationService.createCachePolicy(policyData);
    return {
      success: true,
      data: policy,
      message: 'Cache policy created successfully',
    };
  }

  @Put('policy/:id')
  @ApiOperation({ summary: 'Update cache policy' })
  @ApiResponse({ status: 200, description: 'Cache policy updated successfully' })
  async updateCachePolicy(@Param('id') id: string, updates: any) {
    const policy = await this.cacheOptimizationService.updateCachePolicy(id, updates);
    return {
      success: true,
      data: policy,
      message: 'Cache policy updated successfully',
    };
  }

  @Delete('policy/:id')
  @ApiOperation({ summary: 'Delete cache policy' })
  @ApiResponse({ status: 200, description: 'Cache policy deleted successfully' })
  async deleteCachePolicy(@Param('id') id: string) {
    await this.cacheOptimizationService.deleteCachePolicy(id);
    return {
      success: true,
      message: 'Cache policy deleted successfully',
    };
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get cache policies' })
  @ApiResponse({ status: 200, description: 'Cache policies retrieved successfully' })
  async getCachePolicies(
    @Query('route') route?: string,
    @Query('method') method?: string,
    @Query('strategy') strategy?: CacheStrategy,
    @Query('isActive') isActive?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const filters = {
      route,
      method,
      strategy,
      isActive: isActive !== undefined ? isActive === true : undefined,
      limit: limit ? Number.parseInt(limit.toString()) : undefined,
      offset: offset ? Number.parseInt(offset.toString()) : undefined,
    };

    const result = await this.cacheOptimizationService.getCachePolicies(filters);
    return {
      success: true,
      data: result,
    };
  }

  @Get('config/:route')
  @ApiOperation({ summary: 'Get cache configuration for route' })
  @ApiResponse({ status: 200, description: 'Cache configuration retrieved successfully' })
  async getCacheConfiguration(@Param('route') route: string, @Query('method') method?: string) {
    const config = await this.cacheOptimizationService.getCacheConfiguration(route, method);
    return {
      success: true,
      data: config,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  async getCacheStats() {
    const stats = await this.cacheOptimizationService.getCacheStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Post('etag')
  @ApiOperation({ summary: 'Generate ETag for data' })
  @ApiResponse({ status: 200, description: 'ETag generated successfully' })
  async generateETag(data: any) {
    const etag = this.cacheOptimizationService.generateETag(data);
    return {
      success: true,
      data: { etag },
    };
  }
}
