import { Injectable, Logger } from "@nestjs/common"
import type { ElasticsearchService } from "@nestjs/elasticsearch"
import type { ConfigService } from "@nestjs/config"
import type { Course } from "../../courses/entities/course.entity"
import type { SearchMLService } from "./search-ml.service"

@Injectable()
export class SearchIndexingService {
  private readonly logger = new Logger(SearchIndexingService.name)
  private readonly indexName = "courses"
  private readonly batchSize: number

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
    private readonly searchMLService: SearchMLService,
  ) {
    this.batchSize = this.configService.get<number>("INDEXING_BATCH_SIZE", 100)
  }

  async bulkIndex(courses: Course[]): Promise<any> {
    try {
      const batches = this.chunkArray(courses, this.batchSize)
      const results = []

      for (const batch of batches) {
        const batchResult = await this.indexBatch(batch)
        results.push(batchResult)

        // Add delay between batches to avoid overwhelming Elasticsearch
        await this.delay(100)
      }

      return {
        totalProcessed: courses.length,
        batches: results.length,
        errors: results.filter((r) => r.errors).length,
        items: results.flatMap((r) => r.items),
      }
    } catch (error) {
      this.logger.error("Bulk index failed", error)
      throw error
    }
  }

  private async indexBatch(courses: Course[]): Promise<any> {
    try {
      const body = []

      for (const course of courses) {
        // Generate embedding for semantic search
        const embedding = await this.searchMLService.generateCourseEmbedding(course)

        // Index operation
        body.push({
          index: {
            _index: this.indexName,
            _id: course.id,
          },
        })

        // Document data
        body.push({
          title: course.title,
          description: course.description,
          content: course.content || "",
          category: course.category,
          subcategory: course.subcategory,
          level: course.level,
          duration: course.duration,
          price: course.price,
          instructor: course.instructor,
          tags: course.tags || [],
          skills: course.skills || [],
          prerequisites: course.prerequisites || [],
          language: course.language || "en",
          rating: course.rating || 0,
          enrollmentCount: course.enrollmentCount || 0,
          completionRate: course.completionRate || 0,
          difficulty: course.difficulty,
          format: course.format,
          certification: course.certification || false,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
          publishedAt: course.publishedAt,
          isActive: course.isActive !== false,
          vector_embedding: embedding,
          location: course.location,
        })
      }

      const response = await this.elasticsearchService.bulk({ body })

      if (response.body.errors) {
        this.logger.warn("Some documents failed to index", {
          errors: response.body.items.filter((item: any) => item.index.error),
        })
      }

      return response.body
    } catch (error) {
      this.logger.error("Index batch failed", error)
      throw error
    }
  }

  async reindexAll(): Promise<void> {
    try {
      this.logger.log("Starting full reindex...")

      // Create new index with timestamp
      const newIndexName = `${this.indexName}_${Date.now()}`
      await this.createIndex(newIndexName)

      // TODO: Fetch all courses from database and index them
      // This would typically be done in batches to avoid memory issues

      // Switch alias to new index
      await this.switchAlias(newIndexName)

      // Delete old index
      await this.deleteOldIndices()

      this.logger.log("Full reindex completed successfully")
    } catch (error) {
      this.logger.error("Full reindex failed", error)
      throw error
    }
  }

  private async createIndex(indexName: string): Promise<void> {
    const indexSettings = {
      settings: {
        number_of_shards: 2,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            course_analyzer: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase", "stop", "stemmer", "synonym_filter"],
            },
            autocomplete_analyzer: {
              type: "custom",
              tokenizer: "autocomplete_tokenizer",
              filter: ["lowercase"],
            },
          },
          tokenizer: {
            autocomplete_tokenizer: {
              type: "edge_ngram",
              min_gram: 2,
              max_gram: 20,
              token_chars: ["letter", "digit"],
            },
          },
          filter: {
            synonym_filter: {
              type: "synonym",
              synonyms: [
                "blockchain,distributed ledger",
                "cryptocurrency,crypto,digital currency",
                "smart contract,contract",
                "stellar,xlm",
              ],
            },
          },
        },
      },
      mappings: {
        properties: {
          title: {
            type: "text",
            analyzer: "course_analyzer",
            fields: {
              suggest: {
                type: "completion",
                analyzer: "autocomplete_analyzer",
              },
              keyword: {
                type: "keyword",
              },
            },
          },
          description: {
            type: "text",
            analyzer: "course_analyzer",
            fields: {
              suggest: {
                type: "completion",
                analyzer: "autocomplete_analyzer",
              },
            },
          },
          content: {
            type: "text",
            analyzer: "course_analyzer",
          },
          category: { type: "keyword" },
          subcategory: { type: "keyword" },
          level: { type: "keyword" },
          duration: { type: "integer" },
          price: { type: "float" },
          instructor: {
            type: "text",
            fields: { keyword: { type: "keyword" } },
          },
          tags: { type: "keyword" },
          skills: { type: "keyword" },
          prerequisites: { type: "keyword" },
          language: { type: "keyword" },
          rating: { type: "float" },
          enrollmentCount: { type: "integer" },
          completionRate: { type: "float" },
          difficulty: { type: "keyword" },
          format: { type: "keyword" },
          certification: { type: "boolean" },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
          publishedAt: { type: "date" },
          isActive: { type: "boolean" },
          vector_embedding: {
            type: "dense_vector",
            dims: 384,
          },
          location: { type: "geo_point" },
        },
      },
    }

    await this.elasticsearchService.indices.create({
      index: indexName,
      body: indexSettings,
    })
  }

  private async switchAlias(newIndexName: string): Promise<void> {
    const aliasActions = {
      actions: [
        { remove: { index: "*", alias: this.indexName } },
        { add: { index: newIndexName, alias: this.indexName } },
      ],
    }

    await this.elasticsearchService.indices.updateAliases({
      body: aliasActions,
    })
  }

  private async deleteOldIndices(): Promise<void> {
    try {
      const indices = await this.elasticsearchService.indices.get({
        index: `${this.indexName}_*`,
      })

      const indexNames = Object.keys(indices.body)
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago

      for (const indexName of indexNames) {
        const timestamp = Number.parseInt(indexName.split("_").pop() || "0")
        if (timestamp < cutoffTime) {
          await this.elasticsearchService.indices.delete({ index: indexName })
          this.logger.log(`Deleted old index: ${indexName}`)
        }
      }
    } catch (error) {
      this.logger.warn("Failed to delete old indices", error)
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async getIndexStats(): Promise<any> {
    try {
      const stats = await this.elasticsearchService.indices.stats({
        index: this.indexName,
      })

      return {
        indexName: this.indexName,
        documentCount: stats.body._all.total.docs.count,
        indexSize: stats.body._all.total.store.size_in_bytes,
        shards: stats.body._shards,
      }
    } catch (error) {
      this.logger.error("Get index stats failed", error)
      return null
    }
  }

  async optimizeIndex(): Promise<void> {
    try {
      await this.elasticsearchService.indices.forcemerge({
        index: this.indexName,
        max_num_segments: 1,
      })

      this.logger.log("Index optimization completed")
    } catch (error) {
      this.logger.error("Index optimization failed", error)
    }
  }
}
