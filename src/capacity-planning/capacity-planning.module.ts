import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CapacityPlanningController } from './capacity-planning.controller';
import { CapacityPlanningService } from './services/capacity-planning.service';

@Module({
  imports: [ConfigModule],
  controllers: [CapacityPlanningController],
  providers: [CapacityPlanningService],
  exports: [CapacityPlanningService],
})
export class CapacityPlanningModule {}
