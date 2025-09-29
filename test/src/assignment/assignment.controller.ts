/**
 * AssignmentController handles assignment CRUD operations.
 */
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@ApiTags('Assignment')
@Controller('assignment')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @ApiOperation({ summary: 'Create a new assignment' })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiResponse({ status: 201, description: 'Assignment created.' })
  @Post()
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentService.create(createAssignmentDto);
  }

  @ApiOperation({ summary: 'Get all assignments' })
  @ApiResponse({ status: 200, description: 'List of assignments.' })
  @Get()
  findAll() {
    return this.assignmentService.findAll();
  }

  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Assignment ID' })
  @ApiResponse({ status: 200, description: 'Assignment found.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update assignment' })
  @ApiParam({ name: 'id', type: 'string', description: 'Assignment ID' })
  @ApiBody({ type: UpdateAssignmentDto })
  @ApiResponse({ status: 200, description: 'Assignment updated.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssignmentDto: UpdateAssignmentDto) {
    return this.assignmentService.update(+id, updateAssignmentDto);
  }

  @ApiOperation({ summary: 'Delete assignment' })
  @ApiParam({ name: 'id', type: 'string', description: 'Assignment ID' })
  @ApiResponse({ status: 200, description: 'Assignment deleted.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assignmentService.remove(+id);
  }
}
