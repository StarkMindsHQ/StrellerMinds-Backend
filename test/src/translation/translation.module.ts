import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Translation } from './translation.entity';
import { TranslationService } from './translation.service';
import { TranslationController } from './translation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Translation])],
  providers: [TranslationService],
  controllers: [TranslationController],
  exports: [TranslationService],
})
export class TranslationModule {}
