import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailTemplateVersion } from './entities/email-template-version.entity';
import { TemplateAnalyticsEvent } from './entities/template-analytics-event.entity';
import { EmailTemplateService } from './email-template.service';
import { EmailAbTest } from './entities/email-ad-test.entity';
import { EmailTemplateController } from './email-template.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmailTemplate,
      EmailTemplateVersion,
      EmailAbTest,
      TemplateAnalyticsEvent,
    ]),
  ],
  providers: [EmailTemplateService],
  controllers: [EmailTemplateController],
  exports: [EmailTemplateService],
})
export class EmailTemplateModule {}
