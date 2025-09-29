import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Controller for module-related endpoints.
 */
@ApiTags('Module')
@Controller('module')
export class ModuleController {}
