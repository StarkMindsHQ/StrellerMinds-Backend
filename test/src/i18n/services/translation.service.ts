import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"

import { type Translation, TranslationStatus, TranslationSource } from "../entities/translation.entity"
import type { TmsService } from "./tms.service"

export interface CreateTranslationDto {
  key: string
  locale: string
  namespace: string
  value: string
  description?: string
  context?: string
  metadata?: any
}

export interface UpdateTranslationDto {
  value?: string
  description?: string
  context?: string
  status?: TranslationStatus
  metadata?: any
}

export interface TranslationFilters {
  locale?: string
  namespace?: string
  status?: TranslationStatus
  source?: TranslationSource
  search?: string
  keys?: string[]
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name)

  constructor(
    private readonly translationRepository: Repository<Translation>,
    private readonly tmsService: TmsService,
  ) {}

  async createTranslation(dto: CreateTranslationDto): Promise<Translation> {
    const existingTranslation = await this.translationRepository.findOne({
      where: {
        key: dto.key,
        locale: dto.locale,
        namespace: dto.namespace,
      },
    })

    if (existingTranslation) {
      throw new Error(`Translation already exists for key: ${dto.key}, locale: ${dto.locale}`)
    }

    const translation = this.translationRepository.create({
      ...dto,
      status: TranslationStatus.DRAFT,
      source: TranslationSource.MANUAL,
      version: 1,
    })

    return this.translationRepository.save(translation)
  }

  async updateTranslation(id: string, dto: UpdateTranslationDto): Promise<Translation> {
    const translation = await this.translationRepository.findOne({ where: { id } })
    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`)
    }

    // Create new version if value changed
    if (dto.value && dto.value !== translation.value) {
      translation.version += 1
      translation.translatedAt = new Date()
    }

    Object.assign(translation, dto)
    return this.translationRepository.save(translation)
  }

  async getTranslations(filters: TranslationFilters = {}): Promise<Translation[]> {
    const query = this.translationRepository.createQueryBuilder("translation")

    if (filters.locale) {
      query.andWhere("translation.locale = :locale", { locale: filters.locale })
    }

    if (filters.namespace) {
      query.andWhere("translation.namespace = :namespace", { namespace: filters.namespace })
    }

    if (filters.status) {
      query.andWhere("translation.status = :status", { status: filters.status })
    }

    if (filters.source) {
      query.andWhere("translation.source = :source", { source: filters.source })
    }

    if (filters.keys && filters.keys.length > 0) {
      query.andWhere("translation.key IN (:...keys)", { keys: filters.keys })
    }

    if (filters.search) {
      query.andWhere(
        "(translation.key ILIKE :search OR translation.value ILIKE :search OR translation.description ILIKE :search)",
        { search: `%${filters.search}%` },
      )
    }

    return query.orderBy("translation.namespace", "ASC").addOrderBy("translation.key", "ASC").getMany()
  }

  async getTranslationById(id: string): Promise<Translation> {
    const translation = await this.translationRepository.findOne({ where: { id } })
    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`)
    }
    return translation
  }

  async deleteTranslation(id: string): Promise<void> {
    const result = await this.translationRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException(`Translation with ID ${id} not found`)
    }
  }

  async bulkCreateTranslations(translations: CreateTranslationDto[]): Promise<Translation[]> {
    const entities = translations.map((dto) =>
      this.translationRepository.create({
        ...dto,
        status: TranslationStatus.DRAFT,
        source: TranslationSource.IMPORT,
        version: 1,
      }),
    )

    return this.translationRepository.save(entities)
  }

  async bulkUpdateStatus(ids: string[], status: TranslationStatus): Promise<void> {
    await this.translationRepository.update(ids, {
      status,
      ...(status === TranslationStatus.PUBLISHED && { publishedAt: new Date() }),
    })
  }

  async getTranslationStats(locale?: string): Promise<{
    total: number
    byStatus: Record<TranslationStatus, number>
    byNamespace: Record<string, number>
    completionPercentage: number
  }> {
    const query = this.translationRepository.createQueryBuilder("translation")

    if (locale) {
      query.where("translation.locale = :locale", { locale })
    }

    const translations = await query.getMany()

    const stats = {
      total: translations.length,
      byStatus: {} as Record<TranslationStatus, number>,
      byNamespace: {} as Record<string, number>,
      completionPercentage: 0,
    }

    // Initialize status counts
    Object.values(TranslationStatus).forEach((status) => {
      stats.byStatus[status] = 0
    })

    // Count by status and namespace
    for (const translation of translations) {
      stats.byStatus[translation.status]++
      stats.byNamespace[translation.namespace] = (stats.byNamespace[translation.namespace] || 0) + 1
    }

    // Calculate completion percentage
    const publishedCount = stats.byStatus[TranslationStatus.PUBLISHED]
    stats.completionPercentage = stats.total > 0 ? Math.round((publishedCount / stats.total) * 100) : 0

    return stats
  }

  async syncWithTms(locale: string, namespace?: string): Promise<void> {
    this.logger.log(`Syncing translations with TMS for locale: ${locale}`)

    try {
      const tmsTranslations = await this.tmsService.getTranslations(locale, namespace)

      for (const tmsTranslation of tmsTranslations) {
        const existingTranslation = await this.translationRepository.findOne({
          where: {
            key: tmsTranslation.key,
            locale: tmsTranslation.locale,
            namespace: tmsTranslation.namespace,
          },
        })

        if (existingTranslation) {
          if (existingTranslation.value !== tmsTranslation.value) {
            await this.updateTranslation(existingTranslation.id, {
              value: tmsTranslation.value,
              status: TranslationStatus.APPROVED,
            })
          }
        } else {
          await this.createTranslation({
            ...tmsTranslation,
            source: TranslationSource.TMS,
          })
        }
      }

      this.logger.log(`TMS sync completed for locale: ${locale}`)
    } catch (error) {
      this.logger.error(`TMS sync failed for locale: ${locale}`, error)
      throw error
    }
  }

  async exportTranslations(locale: string, namespace?: string): Promise<Record<string, string>> {
    const filters: TranslationFilters = {
      locale,
      status: TranslationStatus.PUBLISHED,
    }

    if (namespace) {
      filters.namespace = namespace
    }

    const translations = await this.getTranslations(filters)

    const result: Record<string, string> = {}
    for (const translation of translations) {
      const key = namespace ? translation.key : `${translation.namespace}.${translation.key}`
      result[key] = translation.value
    }

    return result
  }
}
