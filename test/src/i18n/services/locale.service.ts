import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"

import { type UserLocale, LocaleSource } from "../entities/user-locale.entity"
import { type LocaleMetadata, LocaleStatus } from "../entities/locale-metadata.entity"

export interface CreateUserLocaleDto {
  userId: string
  locale: string
  source?: LocaleSource
  fallbackLocales?: string[]
  preferences?: any
}

export interface UpdateUserLocaleDto {
  locale?: string
  fallbackLocales?: string[]
  preferences?: any
}

@Injectable()
export class LocaleService {
  private readonly logger = new Logger(LocaleService.name)
  private readonly defaultLocale = "en"

  constructor(
    private readonly userLocaleRepository: Repository<UserLocale>,
    private readonly localeMetadataRepository: Repository<LocaleMetadata>,
  ) {}

  async getUserLocale(userId: string): Promise<string> {
    const userLocale = await this.userLocaleRepository.findOne({
      where: { userId, isActive: true },
    })

    if (userLocale) {
      await this.userLocaleRepository.update(userLocale.id, {
        lastUsedAt: new Date(),
      })
      return userLocale.locale
    }

    return this.defaultLocale
  }

  async setUserLocale(
    userId: string,
    locale: string,
    source: LocaleSource = LocaleSource.USER_PREFERENCE,
  ): Promise<UserLocale> {
    // Validate locale
    const localeMetadata = await this.getLocaleMetadata(locale)
    if (!localeMetadata || localeMetadata.status !== LocaleStatus.ACTIVE) {
      throw new Error(`Locale ${locale} is not supported or active`)
    }

    const existingUserLocale = await this.userLocaleRepository.findOne({
      where: { userId },
    })

    if (existingUserLocale) {
      existingUserLocale.locale = locale
      existingUserLocale.source = source
      existingUserLocale.lastUsedAt = new Date()
      existingUserLocale.fallbackLocales = localeMetadata.fallbackLocales
      return this.userLocaleRepository.save(existingUserLocale)
    } else {
      const userLocale = this.userLocaleRepository.create({
        userId,
        locale,
        source,
        fallbackLocales: localeMetadata.fallbackLocales,
        lastUsedAt: new Date(),
      })
      return this.userLocaleRepository.save(userLocale)
    }
  }

  async getUserLocaleWithFallbacks(userId: string): Promise<string[]> {
    const userLocale = await this.userLocaleRepository.findOne({
      where: { userId, isActive: true },
    })

    if (userLocale) {
      const locales = [userLocale.locale]
      if (userLocale.fallbackLocales) {
        locales.push(...userLocale.fallbackLocales)
      }
      if (!locales.includes(this.defaultLocale)) {
        locales.push(this.defaultLocale)
      }
      return locales
    }

    return [this.defaultLocale]
  }

  async getSupportedLocales(): Promise<LocaleMetadata[]> {
    return this.localeMetadataRepository.find({
      where: { status: LocaleStatus.ACTIVE },
      order: { priority: "DESC", name: "ASC" },
    })
  }

  async getLocaleMetadata(code: string): Promise<LocaleMetadata | null> {
    return this.localeMetadataRepository.findOne({
      where: { code },
    })
  }

  async createLocaleMetadata(data: Partial<LocaleMetadata>): Promise<LocaleMetadata> {
    const locale = this.localeMetadataRepository.create(data)
    return this.localeMetadataRepository.save(locale)
  }

  async updateLocaleMetadata(code: string, data: Partial<LocaleMetadata>): Promise<LocaleMetadata> {
    await this.localeMetadataRepository.update({ code }, data)
    const updated = await this.getLocaleMetadata(code)
    if (!updated) {
      throw new Error(`Locale ${code} not found`)
    }
    return updated
  }

  async getLocaleStats(): Promise<{
    totalLocales: number
    activeLocales: number
    localesByStatus: Record<LocaleStatus, number>
    averageCompletion: number
  }> {
    const locales = await this.localeMetadataRepository.find()

    const stats = {
      totalLocales: locales.length,
      activeLocales: 0,
      localesByStatus: {} as Record<LocaleStatus, number>,
      averageCompletion: 0,
    }

    // Initialize status counts
    Object.values(LocaleStatus).forEach((status) => {
      stats.localesByStatus[status] = 0
    })

    let totalCompletion = 0
    for (const locale of locales) {
      stats.localesByStatus[locale.status]++
      if (locale.status === LocaleStatus.ACTIVE) {
        stats.activeLocales++
      }
      totalCompletion += locale.completionPercentage
    }

    stats.averageCompletion = locales.length > 0 ? Math.round(totalCompletion / locales.length) : 0

    return stats
  }

  async detectLocaleFromGeoLocation(countryCode: string): Promise<string> {
    // Simple country to locale mapping
    const countryLocaleMap: Record<string, string> = {
      US: "en-US",
      GB: "en-GB",
      CA: "en-CA",
      FR: "fr-FR",
      DE: "de-DE",
      ES: "es-ES",
      IT: "it-IT",
      JP: "ja-JP",
      KR: "ko-KR",
      CN: "zh-CN",
      BR: "pt-BR",
      MX: "es-MX",
      RU: "ru-RU",
      IN: "en-IN",
    }

    const locale = countryLocaleMap[countryCode.toUpperCase()]
    if (locale) {
      const localeMetadata = await this.getLocaleMetadata(locale)
      if (localeMetadata && localeMetadata.status === LocaleStatus.ACTIVE) {
        return locale
      }
    }

    return this.defaultLocale
  }

  async getUserPreferences(userId: string): Promise<any> {
    const userLocale = await this.userLocaleRepository.findOne({
      where: { userId, isActive: true },
    })

    return userLocale?.preferences || {}
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    const userLocale = await this.userLocaleRepository.findOne({
      where: { userId, isActive: true },
    })

    if (userLocale) {
      userLocale.preferences = { ...userLocale.preferences, ...preferences }
      await this.userLocaleRepository.save(userLocale)
    }
  }
}
