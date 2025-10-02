import { Controller, Post, Get, Put, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import type { DataGovernanceService } from '../services/data-governance.service';

@ApiTags('Data Governance')
@Controller('data-governance')
export class DataGovernanceController {
  constructor(private readonly governanceService: DataGovernanceService) {}

  @Post('policies')
  @ApiOperation({ summary: 'Create a new governance policy' })
  @ApiResponse({ status: 201, description: 'Policy created successfully' })
  async createPolicy(policyData: any) {
    return this.governanceService.createPolicy(policyData);
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get governance policies' })
  @ApiResponse({ status: 200, description: 'Policies retrieved successfully' })
  async getPolicies(
    @Query('policyType') policyType?: string,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.governanceService.getPolicies({
      policyType,
      status: status as any,
      entityType,
    });
  }

  @Put('policies/:id')
  @ApiOperation({ summary: 'Update a governance policy' })
  @ApiResponse({ status: 200, description: 'Policy updated successfully' })
  async updatePolicy(@Param('id') id: string, updates: any) {
    return this.governanceService.updatePolicy(id, updates);
  }

  @Put('policies/:id/activate')
  @ApiOperation({ summary: 'Activate a governance policy' })
  @ApiResponse({ status: 200, description: 'Policy activated successfully' })
  async activatePolicy(@Param('id') id: string) {
    await this.governanceService.activatePolicy(id);
    return { success: true, message: 'Policy activated successfully' };
  }

  @Put('policies/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a governance policy' })
  @ApiResponse({ status: 200, description: 'Policy deactivated successfully' })
  async deactivatePolicy(@Param('id') id: string) {
    await this.governanceService.deactivatePolicy(id);
    return { success: true, message: 'Policy deactivated successfully' };
  }

  @Post('compliance/check')
  @ApiOperation({ summary: 'Check policy compliance for dataset' })
  @ApiResponse({ status: 200, description: 'Compliance check completed' })
  async checkCompliance(body: { entityType: string; data: any[] }) {
    return this.governanceService.checkPolicyCompliance(body.entityType, body.data);
  }

  @Post('lineage')
  @ApiOperation({ summary: 'Record data lineage' })
  @ApiResponse({ status: 201, description: 'Lineage recorded successfully' })
  async recordLineage(lineageData: any) {
    return this.governanceService.recordLineage(lineageData);
  }

  @Get('lineage/:entityName')
  @ApiOperation({ summary: 'Get data lineage for entity' })
  @ApiResponse({ status: 200, description: 'Lineage retrieved successfully' })
  async getLineage(@Param('entityName') entityName: string) {
    return this.governanceService.getLineage(entityName);
  }

  @Get('reports/governance')
  @ApiOperation({ summary: 'Get governance report' })
  @ApiResponse({ status: 200, description: 'Governance report retrieved successfully' })
  async getGovernanceReport() {
    return this.governanceService.generateGovernanceReport();
  }
}
