import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AcceptLanguageResolver, I18nModule, QueryResolver, HeaderResolver } from "nestjs-i18n"
import { join } from "path"

import { I18nController } from "./controllers/i18n.controller"
import { I18nService } from "./services/i18n.service"
import { TranslationService } from "./services/translation.service"
import { LocaleService } from "./services/locale.service"
import { TmsService } from "./services/tms.service"

import { Translation } from "./entities/translation.entity"
import { UserLocale } from "./entities/user-locale.entity"
import { LocaleMetadata } from "./entities/locale-metadata.entity"

import { I18nMiddleware } from "./middleware/i18n.middleware"
import { LocaleInterceptor } from "./interceptors/locale.interceptor"

@Module({
  imports: [
    TypeOrmModule.forFeature([Translation, UserLocale, LocaleMetadata]),
    I18nModule.forRoot({
      fallbackLanguage: "en",
      loaderOptions: {
        path: join(__dirname, "../i18n/"),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ["lang"] },
        { use: HeaderResolver, options: ["x-custom-lang"] },
        AcceptLanguageResolver,
      ],
      typesOutputPath: join(__dirname, "../generated/i18n.generated.ts"),
      throwOnMissingKey: false,
      logging: process.env.NODE_ENV === "development",
    }),
  ],
  controllers: [I18nController],
  providers: [I18nService, TranslationService, LocaleService, TmsService, I18nMiddleware, LocaleInterceptor],
  exports: [I18nService, TranslationService, LocaleService, TmsService],
})
export class I18nApiModule {}
