import { PartialType } from '@nestjs/swagger';
import { CreateMonitoringDto } from './create-monitoring.dto';

/**
 * DTO for updating a monitoring resource (partial fields allowed, reserved for future use).
 */
export class UpdateMonitoringDto extends PartialType(CreateMonitoringDto) {}
