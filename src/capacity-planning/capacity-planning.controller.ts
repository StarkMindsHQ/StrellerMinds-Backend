import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { UserRole } from '../auth/entities/user.entity';
import { CapacityPlanningService } from './services/capacity-planning.service';

@ApiTags('Capacity Planning')
@Controller('capacity-planning')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class CapacityPlanningController {
  constructor(private readonly capacityPlanningService: CapacityPlanningService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get the capacity planning dashboard' })
  @ApiResponse({ status: 200, description: 'Capacity planning dashboard returned' })
  getDashboard() {
    return this.capacityPlanningService.getDashboard();
  }

  @Post('snapshots')
  @ApiOperation({ summary: 'Capture a resource usage snapshot' })
  @ApiResponse({ status: 201, description: 'Snapshot captured successfully' })
  captureSnapshot() {
    return this.capacityPlanningService.recordManualSnapshot();
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Get capacity forecasts' })
  @ApiResponse({ status: 200, description: 'Capacity forecasts returned' })
  getForecast() {
    return this.capacityPlanningService.getCapacityForecast();
  }

  @Get('auto-scaling')
  @ApiOperation({ summary: 'Get autoscaling recommendations' })
  @ApiResponse({ status: 200, description: 'Autoscaling strategy returned' })
  getAutoScalingStrategy() {
    return this.capacityPlanningService.getAutoScalingStrategy();
  }

  @Post('benchmarks/run')
  @ApiOperation({ summary: 'Run a capacity benchmark' })
  @ApiResponse({ status: 201, description: 'Benchmark completed successfully' })
  runBenchmark(@Body('scenario') scenario?: string) {
    return this.capacityPlanningService.runBenchmark(scenario);
  }

  @Get('benchmarks/history')
  @ApiOperation({ summary: 'Get benchmark history' })
  @ApiResponse({ status: 200, description: 'Benchmark history returned' })
  getBenchmarkHistory() {
    return this.capacityPlanningService.getBenchmarkHistory();
  }

  @Get('documentation')
  @ApiOperation({ summary: 'Get scaling documentation metadata' })
  @ApiResponse({ status: 200, description: 'Scaling documentation metadata returned' })
  getDocumentation() {
    return this.capacityPlanningService.getScalingDocumentation();
  }
}
