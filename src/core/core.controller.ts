import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CoreService } from './core.service';
import { CreateCoreDto } from './dto/create-core.dto';
import { UpdateCoreDto } from './dto/update-core.dto';

@Controller('core')
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

  @Post()
  create(@Body() createCoreDto: CreateCoreDto) {
    return this.coreService.create(createCoreDto);
  }

  @Get()
  findAll() {
    return this.coreService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coreService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCoreDto: UpdateCoreDto) {
    return this.coreService.update(+id, updateCoreDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coreService.remove(+id);
  }
}
