import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"
import type { I18nService } from "../services/i18n.service"

export interface LocalizedRequest extends Request {
  locale: string
  fallbackLocales: string[]
  userLocale?: string
}

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  constructor(private readonly i18nService: I18nService) {}

  async use(req: LocalizedRequest, res: Response, next: NextFunction) {
    try {
      // Detect locale from various sources
      let detectedLocale = await this.i18nService.detectLocaleFromRequest(req)

      // If user is authenticated, get their preferred locale
      if (req.user?.id) {
        const userLocale = await this.i18nService.getUserLocale(req.user.id)
        if (userLocale) {
          req.userLocale = userLocale
          detectedLocale = userLocale
        }
      }

      // Set locale on request
      req.locale = detectedLocale

      // Get fallback locales
      const supportedLocales = await this.i18nService.getSupportedLocales()
      const localeMetadata = supportedLocales.find((locale) => locale.code === detectedLocale)
      req.fallbackLocales = localeMetadata?.fallbackLocales || ["en"]

      // Set locale header for response
      res.setHeader("Content-Language", detectedLocale)

      next()
    } catch (error) {
      // Fallback to default locale on error
      req.locale = "en"
      req.fallbackLocales = ["en"]
      res.setHeader("Content-Language", "en")
      next()
    }
  }
}
