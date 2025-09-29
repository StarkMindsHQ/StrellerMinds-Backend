import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"

import type { I18nService } from "../services/i18n.service"
import type { TranslationService } from "../services/translation.service"
import type { LocaleService } from "../services/locale.service"
import type { TmsService } from "../services/tms.service"

import type { CreateTranslationDto, UpdateTranslationDto, TranslationFilters } from "../services/translation.service"
import type { LocalizedRequest } from "../middleware/i18n.middleware"

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard"
import { CurrentUser } from "../../auth/decorators/current-user.decorator"

@ApiTags("Internationalization")
@Controller("i18n")
export class I18nController {
  constructor(
    private readonly i18nService: I18nService,
    private readonly translationService: TranslationService,
    private readonly localeService: LocaleService,
    private readonly tmsService: TmsService,
  ) {}

  @Get("locales")
  @ApiOperation({ summary: "Get supported locales" })
  @ApiResponse({ status: 200, description: "List of supported locales" })
  async getSupportedLocales() {
    return this.localeService.getSupportedLocales()
  }

  @Get("locales/stats")
  @ApiOperation({ summary: "Get locale statistics" })
  @ApiResponse({ status: 200, description: "Locale statistics" })
  async getLocaleStats() {
    return this.localeService.getLocaleStats()
  }

  @Get("translations")
  @ApiOperation({ summary: "Get translations with filters" })
  @ApiResponse({ status: 200, description: "List of translations" })
  async getTranslations(filters: TranslationFilters) {
    return this.translationService.getTranslations(filters)
  }

  @Post("translations")
  @ApiOperation({ summary: "Create a new translation" })
  @ApiResponse({ status: 201, description: "Translation created successfully" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createTranslation(@Body() dto: CreateTranslationDto) {
    return this.translationService.createTranslation(dto)
  }

  @Put("translations/:id")
  @ApiOperation({ summary: "Update a translation" })
  @ApiResponse({ status: 200, description: "Translation updated successfully" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateTranslation(@Param("id") id: string, @Body() dto: UpdateTranslationDto) {
    return this.translationService.updateTranslation(id, dto)
  }

  @Delete("translations/:id")
  @ApiOperation({ summary: "Delete a translation" })
  @ApiResponse({ status: 200, description: "Translation deleted successfully" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteTranslation(@Param("id") id: string) {
    await this.translationService.deleteTranslation(id)
    return { success: true }
  }

  @Get("translations/stats")
  @ApiOperation({ summary: "Get translation statistics" })
  @ApiResponse({ status: 200, description: "Translation statistics" })
  async getTranslationStats(locale?: string) {
    return this.translationService.getTranslationStats(locale)
  }

  @Post("translations/bulk")
  @ApiOperation({ summary: "Bulk create translations" })
  @ApiResponse({ status: 201, description: "Translations created successfully" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async bulkCreateTranslations(@Body() translations: CreateTranslationDto[]) {
    return this.translationService.bulkCreateTranslations(translations)
  }

  @Get("translations/export")
  @ApiOperation({ summary: "Export translations for a locale" })
  @ApiResponse({ status: 200, description: "Exported translations" })
  async exportTranslations(@Query("locale") locale: string, @Query("namespace") namespace?: string) {
    return this.translationService.exportTranslations(locale, namespace)
  }

  @Get("user/locale")
  @ApiOperation({ summary: "Get current user's locale preference" })
  @ApiResponse({ status: 200, description: "User locale preference" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getUserLocale(@CurrentUser() user: any) {
    const locale = await this.i18nService.getUserLocale(user.id)
    const preferences = await this.localeService.getUserPreferences(user.id)
    
    return {
      locale,
      preferences,
      fallbackLocales: await this.localeService.getUserLocaleWithFallbacks(user.id),
    }
  }

  @Post("user/locale")
  @ApiOperation({ summary: "Set user's locale preference" })
  @ApiResponse({ status: 200, description: "User locale updated successfully" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async setUserLocale(@CurrentUser() user: any, @Body() dto: { locale: string; preferences?: any }) {
    await this.i18nService.setUserLocale(user.id, dto.locale)

    if (dto.preferences) {
      await this.localeService.updateUserPreferences(user.id, dto.preferences)
    }

    return { success: true }
  }

  @Get("translate")
  @ApiOperation({ summary: "Translate a key" })
  @ApiResponse({ status: 200, description: "Translation result" })
  async translate(
    @Query("key") key: string,
    @Query("locale") locale?: string,
    @Query("namespace") namespace?: string,
    @Query("args") args?: string,
    @Req() req?: LocalizedRequest,
  ) {
    const targetLocale = locale || req?.locale || "en"
    const parsedArgs = args ? JSON.parse(args) : undefined

    const translation = await this.i18nService.translate(key, {
      locale: targetLocale,
      namespace,
      args: parsedArgs,
    })

    return {
      key,
      locale: targetLocale,
      translation,
    }
  }

  @Post("translate/multiple")
  @ApiOperation({ summary: "Translate multiple keys" })
  @ApiResponse({ status: 200, description: "Multiple translations result" })
  async translateMultiple(
    @Body() dto: { keys: string[]; locale?: string; namespace?: string; args?: any },
    @Req() req?: LocalizedRequest,
  ) {
    const targetLocale = dto.locale || req?.locale || "en"

    const translations = await this.i18nService.translateMultiple(dto.keys, {
      locale: targetLocale,
      namespace: dto.namespace,
      args: dto.args,
    })

    return {
      locale: targetLocale,
      translations,
    }
  }

  @Get("namespace/:namespace")
  @ApiOperation({ summary: "Get all translations for a namespace" })
  @ApiResponse({ status: 200, description: "Namespace translations" })
  async getNamespaceTranslations(
    @Param("namespace") namespace: string,
    @Query("locale") locale?: string,
    @Req() req?: LocalizedRequest,
  ) {
    const targetLocale = locale || req?.locale || "en"

    const translations = await this.i18nService.getNamespaceTranslations(namespace, targetLocale)

    return {
      namespace,
      locale: targetLocale,
      translations,
    }
  }

  @Post("sync/tms")
  @ApiOperation({ summary: "Sync translations with TMS" })
  @ApiResponse({ status: 200, description: "TMS sync completed" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async syncWithTms(
    @Body() dto: { locale: string; namespace?: string },
  ) {
    await this.translationService.syncWithTms(dto.locale, dto.namespace)
    return { success: true }
  }

  @Get("tms/project")
  @ApiOperation({ summary: "Get TMS project information" })
  @ApiResponse({ status: 200, description: "TMS project information" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getTmsProject() {
    return this.tmsService.getProject()
  }

  @Post("cache/invalidate")
  @ApiOperation({ summary: "Invalidate translation cache" })
  @ApiResponse({ status: 200, description: "Cache invalidated successfully" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async invalidateCache(
    @Body() dto: { locale?: string; namespace?: string },
  ) {
    await this.i18nService.invalidateCache(dto.locale, dto.namespace)
    return { success: true }
  }
}
