import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"

export interface TmsTranslation {
  key: string
  locale: string
  namespace: string
  value: string
  description?: string
  context?: string
  metadata?: any
}

export interface TmsProject {
  id: string
  name: string
  sourceLocale: string
  targetLocales: string[]
  status: string
}

@Injectable()
export class TmsService {
  private readonly logger = new Logger(TmsService.name)
  private readonly apiUrl: string
  private readonly apiKey: string
  private readonly projectId: string

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>("TMS_API_URL", "")
    this.apiKey = this.configService.get<string>("TMS_API_KEY", "")
    this.projectId = this.configService.get<string>("TMS_PROJECT_ID", "")
  }

  async getTranslations(locale: string, namespace?: string): Promise<TmsTranslation[]> {
    if (!this.isConfigured()) {
      this.logger.warn("TMS not configured, returning empty translations")
      return []
    }

    try {
      const url = new URL(`${this.apiUrl}/projects/${this.projectId}/translations`)
      url.searchParams.set("locale", locale)
      if (namespace) {
        url.searchParams.set("namespace", namespace)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`TMS API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return this.mapTmsResponse(data)
    } catch (error) {
      this.logger.error(`Failed to fetch translations from TMS:`, error)
      throw error
    }
  }

  async uploadTranslations(translations: TmsTranslation[]): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn("TMS not configured, skipping upload")
      return
    }

    try {
      const response = await fetch(`${this.apiUrl}/projects/${this.projectId}/translations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          translations: translations.map(this.mapToTmsFormat),
        }),
      })

      if (!response.ok) {
        throw new Error(`TMS API error: ${response.status} ${response.statusText}`)
      }

      this.logger.log(`Uploaded ${translations.length} translations to TMS`)
    } catch (error) {
      this.logger.error(`Failed to upload translations to TMS:`, error)
      throw error
    }
  }

  async getProject(): Promise<TmsProject | null> {
    if (!this.isConfigured()) {
      return null
    }

    try {
      const response = await fetch(`${this.apiUrl}/projects/${this.projectId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`TMS API error: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      this.logger.error(`Failed to fetch project from TMS:`, error)
      return null
    }
  }

  async requestTranslation(
    key: string,
    sourceLocale: string,
    targetLocales: string[],
    context?: string,
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn("TMS not configured, skipping translation request")
      return
    }

    try {
      const response = await fetch(`${this.apiUrl}/projects/${this.projectId}/translation-requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          sourceLocale,
          targetLocales,
          context,
        }),
      })

      if (!response.ok) {
        throw new Error(`TMS API error: ${response.status} ${response.statusText}`)
      }

      this.logger.log(`Requested translation for key: ${key}`)
    } catch (error) {
      this.logger.error(`Failed to request translation from TMS:`, error)
      throw error
    }
  }

  async getTranslationStatus(key: string, locale: string): Promise<string | null> {
    if (!this.isConfigured()) {
      return null
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/projects/${this.projectId}/translations/${key}/status?locale=${locale}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.status
    } catch (error) {
      this.logger.error(`Failed to get translation status from TMS:`, error)
      return null
    }
  }

  private isConfigured(): boolean {
    return !!(this.apiUrl && this.apiKey && this.projectId)
  }

  private mapTmsResponse(data: any): TmsTranslation[] {
    // Map TMS-specific response format to our internal format
    if (!data.translations || !Array.isArray(data.translations)) {
      return []
    }

    return data.translations.map((item: any) => ({
      key: item.key || item.identifier,
      locale: item.locale || item.language,
      namespace: item.namespace || item.file || "common",
      value: item.value || item.translation,
      description: item.description || item.comment,
      context: item.context,
      metadata: {
        tmsId: item.id,
        lastModified: item.updatedAt,
        status: item.status,
      },
    }))
  }

  private mapToTmsFormat(translation: TmsTranslation): any {
    // Map our internal format to TMS-specific format
    return {
      key: translation.key,
      locale: translation.locale,
      namespace: translation.namespace,
      value: translation.value,
      description: translation.description,
      context: translation.context,
    }
  }
}
