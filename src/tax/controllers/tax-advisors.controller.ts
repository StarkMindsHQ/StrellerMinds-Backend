import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TaxAdvisorsService } from '../services/tax-advisors.service';
import { CreateTaxAdvisorDto } from '../dto/create-tax-advisor.dto';
import { UpdateTaxAdvisorDto } from '../dto/update-tax-advisor.dto';
import { AssignAdvisorDto } from '../dto/assign-advisor.dto';

@Controller('tax/advisors')
export class TaxAdvisorsController {
  constructor(private readonly service: TaxAdvisorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTaxAdvisorDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll(@Query('jurisdiction') jurisdiction?: string) {
    return this.service.findAll(jurisdiction);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxAdvisorDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deactivate(id);
  }

  @Post(':id/assignments')
  @HttpCode(HttpStatus.CREATED)
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAdvisorDto,
  ) {
    return this.service.assignToProperty(id, dto.propertyId);
  }

  @Get(':id/assignments')
  async listAssignments(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listAssignments(id);
  }

  @Delete(':id/assignments/:propertyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('propertyId') propertyId: string,
  ) {
    await this.service.unassignFromProperty(id, propertyId);
  }
}
