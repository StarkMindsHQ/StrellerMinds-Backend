import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DatabaseDashboardService } from '../services/database-dashboard.service';

@ApiTags('Database Dashboard')
@Controller('database-dashboard')
export class DatabaseDashboardController {
  constructor(private readonly databaseDashboardService: DatabaseDashboardService) {}

  @Get('performance-summary')
  @ApiOperation({ summary: 'Get database performance summary' })
  @ApiResponse({ status: 200, description: 'Database performance summary retrieved successfully' })
  @ApiQuery({ name: 'hours', required: false, description: 'Time range in hours (default: 24)' })
  async getPerformanceSummary(@Query('hours') hours?: number) {
    return this.databaseDashboardService.getPerformanceSummary(hours);
  }

  @Get('slow-queries')
  @ApiOperation({ summary: 'Get slow queries' })
  @ApiResponse({ status: 200, description: 'Slow queries retrieved successfully' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of queries to return (default: 50)',
  })
  @ApiQuery({ name: 'hours', required: false, description: 'Time range in hours (default: 24)' })
  async getSlowQueries(@Query('limit') limit?: number, @Query('hours') hours?: number) {
    return this.databaseDashboardService.getSlowQueries(limit, hours);
  }

  @Get('connection-pool')
  @ApiOperation({ summary: 'Get connection pool metrics' })
  @ApiResponse({ status: 200, description: 'Connection pool metrics retrieved successfully' })
  async getConnectionPoolMetrics() {
    return this.databaseDashboardService.getConnectionPoolMetrics();
  }

  @Get('cache-stats')
  @ApiOperation({ summary: 'Get query cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  async getCacheStats() {
    return this.databaseDashboardService.getCacheStats();
  }

  @Get('top-tables')
  @ApiOperation({ summary: 'Get top tables by usage' })
  @ApiResponse({ status: 200, description: 'Top tables retrieved successfully' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of tables to return (default: 10)',
  })
  async getTopTables(@Query('limit') limit?: number) {
    return this.databaseDashboardService.getTopTables(limit);
  }

  @Get('query-analysis')
  @ApiOperation({ summary: 'Get query analysis results' })
  @ApiResponse({ status: 200, description: 'Query analysis retrieved successfully' })
  @ApiQuery({ name: 'queryId', required: true, description: 'Query ID to analyze' })
  async getQueryAnalysis(@Query('queryId') queryId: string) {
    return this.databaseDashboardService.getQueryAnalysis(queryId);
  }
}
