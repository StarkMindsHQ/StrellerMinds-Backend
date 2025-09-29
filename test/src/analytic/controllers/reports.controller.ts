import { Controller, Get, Post, Put, Delete, Param, Query, ValidationPipe, UsePipes, Res } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import type { Response } from "express"

import type { ReportingService } from "../services/reporting.service"
import type { Report, ReportType } from "../entities/report.entity"

@ApiTags("Reports")
@Controller("analytics/reports")
export class ReportsController {
  constructor(private readonly reportingService: ReportingService) {}

  @Post()
  @ApiOperation({ summary: "Create a new report" })
  @ApiResponse({ status: 201, description: "Report created successfully" })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createReport(reportData: Partial<Report>) {
    return this.reportingService.createReport(reportData)
  }

  @Get()
  @ApiOperation({ summary: "Get all reports" })
  @ApiResponse({ status: 200, description: "Reports retrieved successfully" })
  async getReports(
    @Query('type') type?: ReportType,
    @Query('createdBy') createdBy?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.reportingService.getReports({
      type,
      createdBy,
      isActive: isActive !== undefined ? isActive === true : undefined,
    })
  }

  @Post(":id/execute")
  @ApiOperation({ summary: "Execute a report" })
  @ApiResponse({ status: 200, description: "Report executed successfully" })
  async executeReport(@Param('id') id: string, @Res() res: Response) {
    const result = await this.reportingService.executeReport(id)

    // Set appropriate headers based on format
    if (typeof result === "string") {
      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", `attachment; filename="report-${id}.csv"`)
    } else if (Buffer.isBuffer(result)) {
      res.setHeader("Content-Type", "application/octet-stream")
      res.setHeader("Content-Disposition", `attachment; filename="report-${id}"`)
    } else {
      res.setHeader("Content-Type", "application/json")
    }

    res.send(result)
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a report" })
  @ApiResponse({ status: 200, description: "Report updated successfully" })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateReport(@Param('id') id: string, updateData: Partial<Report>) {
    // Implementation would update the report
    return { success: true, message: "Report updated successfully" }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  async deleteReport(@Param('id') id: string) {
    // Implementation would delete the report
    return { success: true, message: 'Report deleted successfully' };
  }
}
