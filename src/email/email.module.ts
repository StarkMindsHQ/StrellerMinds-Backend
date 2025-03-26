import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { BullModule } from "@nestjs/bull"
import { TypeOrmModule } from "@nestjs/typeorm"
import { EmailService } from "./email.service"
import { EmailController } from "./email.controller"
import { EmailPreferenceController } from "./email-preference.controller"
import { EmailProcessor } from "./email.processor"
import { EmailTemplate } from "./entities/email-template.entity"
import { EmailLog } from "./entities/email-log.entity"
import { EmailPreference } from "./entities/email-preference.entity"
import { EmailAnalyticsController } from "./admin/analytics.controller"
import { EmailTemplateController } from "./admin/template.controller"
import { EmailTemplateService } from "./admin/template.service"
import { EmailTestService } from "./utils/test.util"
import { EmailPreviewController } from "./admin/preview.controller"

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EmailTemplate, EmailLog, EmailPreference]),
    BullModule.registerQueue({
      name: "email",
    }),
  ],
  controllers: [
    EmailController,
    EmailPreferenceController,
    EmailAnalyticsController,
    EmailTemplateController,
    EmailPreviewController,
  ],
  providers: [EmailService, EmailProcessor, EmailTemplateService, EmailTestService],
  exports: [EmailService],
})
export class EmailModule {}

