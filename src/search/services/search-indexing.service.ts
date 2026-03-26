import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ContentDocument } from '../entities/content.entity';

/**
 * Search Indexing Service
 * Manages Elasticsearch index operations, bulk indexing, and index optimization
 */
@Injectable()
export class SearchIndexingService implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexingService.name);
  private readonly CONTENT_INDEX = 'content';
  private readonly BULK_SIZE = 1000;

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async onModuleInit() {
    await this.initializeIndices();
  }

  /**
   * Initialize all search indices with proper mappings
   */
  async initializeIndices(): Promise<void> {
    await this.createContentIndex();
    await this.createAnalyticsIndex();
    await this.createSuggestionsIndex();
  }

  /**
   * Create content index with optimized mappings
   */
  private async createContentIndex(): Promise<void> {
    const exists = await this.elasticsearchService.indices.exists({
      index: this.CONTENT_INDEX,
    });

    if (exists) {
      this.logger.log('Content index already exists');
      return;
    }

    await this.elasticsearchService.indices.create({
      index: this.CONTENT_INDEX,
      settings: {
        number_of_shards: 2,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            content_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: [
                'lowercase',
                'asciifolding',
                'content_stop',
                'synonym_filter',
                'word_delimiter',
              ],
            },
            search_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding', 'synonym_filter'],
            },
            autocomplete_analyzer: {
              type: 'custom',
              tokenizer: 'autocomplete_tokenizer',
              filter: ['lowercase'],
            },
          },
          tokenizer: {
            autocomplete_tokenizer: {
              type: 'edge_ngram',
              min_gram: 2,
              max_gram: 20,
              token_chars: ['letter', 'digit'],
            },
          },
          filter: {
            content_stop: {
              type: 'stop',
              stopwords: '_english_',
            },
            synonym_filter: {
              type: 'synonym_graph',
              synonyms: [
                'js, javascript',
                'py, python',
                'ts, typescript',
                'ml, machine learning',
                'ai, artificial intelligence',
                'bc, blockchain',
                'nft, non-fungible token',
                'defi, decentralized finance',
                'api, application programming interface',
                'ui, user interface',
                'ux, user experience',
              ],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'content_analyzer',
            search_analyzer: 'search_analyzer',
            fields: {
              keyword: { type: 'keyword' },
              autocomplete: {
                type: 'text',
                analyzer: 'autocomplete_analyzer',
                search_analyzer: 'search_analyzer',
              },
              suggest: { type: 'completion' },
            },
          },
          description: {
            type: 'text',
            analyzer: 'content_analyzer',
            search_analyzer: 'search_analyzer',
          },
          content: {
            type: 'text',
            analyzer: 'content_analyzer',
            search_analyzer: 'search_analyzer',
          },
          category: { type: 'keyword' },
          difficulty: { type: 'keyword' },
          duration: { type: 'integer' },
          author: { type: 'keyword' },
          tags: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          viewCount: { type: 'integer' },
          rating: { type: 'float' },
          enrolledCount: { type: 'integer' },
          completionRate: { type: 'float' },
          // Vector field for future semantic search
          embedding: {
            type: 'dense_vector',
            dims: 768,
            index: true,
            similarity: 'cosine',
          },
        },
      },
    });

    this.logger.log('Content index created successfully');
  }

  /**
   * Create analytics index
   */
  private async createAnalyticsIndex(): Promise<void> {
    const indexName = 'search_analytics';
    const exists = await this.elasticsearchService.indices.exists({ index: indexName });

    if (exists) return;

    await this.elasticsearchService.indices.create({
      index: indexName,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      mappings: {
        properties: {
          userId: { type: 'keyword' },
          query: { type: 'text' },
          normalizedQuery: { type: 'keyword' },
          filters: { type: 'object', enabled: false },
          resultsCount: { type: 'integer' },
          executionTimeMs: { type: 'integer' },
          clickedResults: { type: 'keyword' },
          timestamp: { type: 'date' },
          userAgent: { type: 'keyword' },
          ipAddress: { type: 'ip' },
          sessionId: { type: 'keyword' },
        },
      },
    });

    this.logger.log('Analytics index created');
  }

  /**
   * Create suggestions index for autocomplete
   */
  private async createSuggestionsIndex(): Promise<void> {
    const indexName = 'search_suggestions';
    const exists = await this.elasticsearchService.indices.exists({ index: indexName });

    if (exists) return;

    await this.elasticsearchService.indices.create({
      index: indexName,
      mappings: {
        properties: {
          suggestion: {
            type: 'completion',
            analyzer: 'simple',
            preserve_separators: true,
            preserve_position_increments: true,
            max_input_length: 50,
          },
          weight: { type: 'integer' },
          category: { type: 'keyword' },
        },
      },
    });

    this.logger.log('Suggestions index created');
  }

  /**
   * Index a single document
   */
  async indexDocument(document: ContentDocument): Promise<void> {
    try {
      await this.elasticsearchService.index({
        index: this.CONTENT_INDEX,
        id: document.id,
        document,
      });
    } catch (error) {
      this.logger.error(`Failed to index document ${document.id}`, error);
      throw error;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(documents: ContentDocument[]): Promise<BulkIndexResult> {
    const result: BulkIndexResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches
    for (let i = 0; i < documents.length; i += this.BULK_SIZE) {
      const batch = documents.slice(i, i + this.BULK_SIZE);
      const batchResult = await this.processBulkBatch(batch);
      
      result.successful += batchResult.successful;
      result.failed += batchResult.failed;
      result.errors.push(...batchResult.errors);
    }

    this.logger.log(
      `Bulk indexing complete: ${result.successful} successful, ${result.failed} failed`,
    );

    return result;
  }

  /**
   * Process a single batch of documents
   */
  private async processBulkBatch(documents: ContentDocument[]): Promise<BulkIndexResult> {
    const operations = documents.flatMap((doc) => [
      { index: { _index: this.CONTENT_INDEX, _id: doc.id } },
      doc,
    ]);

    try {
      const response = await this.elasticsearchService.bulk({
        operations,
        refresh: 'wait_for',
      });

      const result: BulkIndexResult = {
        successful: 0,
        failed: 0,
        errors: [],
      };

      if (response.errors) {
        response.items.forEach((item: any, index: number) => {
          if (item.index?.error) {
            result.failed++;
            result.errors.push({
              documentId: documents[index].id,
              error: item.index.error.reason,
            });
          } else {
            result.successful++;
          }
        });
      } else {
        result.successful = documents.length;
      }

      return result;
    } catch (error) {
      this.logger.error('Bulk indexing failed', error);
      return {
        successful: 0,
        failed: documents.length,
        errors: documents.map((d) => ({ documentId: d.id, error: error.message })),
      };
    }
  }

  /**
   * Update a document partially
   */
  async updateDocument(id: string, partialDoc: Partial<ContentDocument>): Promise<void> {
    try {
      await this.elasticsearchService.update({
        index: this.CONTENT_INDEX,
        id,
        doc: partialDoc,
      });
    } catch (error) {
      this.logger.error(`Failed to update document ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: this.CONTENT_INDEX,
        id,
      });
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete multiple documents
   */
  async bulkDelete(ids: string[]): Promise<number> {
    const operations = ids.flatMap((id) => [{ delete: { _index: this.CONTENT_INDEX, _id: id } }]);

    try {
      const response = await this.elasticsearchService.bulk({ operations });
      const deleted = response.items.filter((item: any) => !item.delete?.error).length;
      this.logger.log(`Bulk deleted ${deleted} documents`);
      return deleted;
    } catch (error) {
      this.logger.error('Bulk delete failed', error);
      throw error;
    }
  }

  /**
   * Refresh index to make changes visible immediately
   */
  async refreshIndex(): Promise<void> {
    await this.elasticsearchService.indices.refresh({ index: this.CONTENT_INDEX });
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<IndexStats> {
    const stats = await this.elasticsearchService.indices.stats({
      index: this.CONTENT_INDEX,
    });

    const indexStats = stats.indices[this.CONTENT_INDEX];

    return {
      documentCount: indexStats.total.docs.count,
      sizeInBytes: indexStats.total.store.size_in_bytes,
      indexRate: indexStats.total.indexing.index_total,
      searchRate: indexStats.total.search.query_total,
      segments: indexStats.total.segments.count,
    };
  }

  /**
   * Optimize index by force merging segments
   */
  async optimizeIndex(maxSegments: number = 1): Promise<void> {
    this.logger.log(`Optimizing index to ${maxSegments} segments...`);
    
    await this.elasticsearchService.indices.forcemerge({
      index: this.CONTENT_INDEX,
      max_num_segments: maxSegments,
    });

    this.logger.log('Index optimization complete');
  }

  /**
   * Reindex data from one index to another
   */
  async reindex(sourceIndex: string, destIndex: string, query?: any): Promise<number> {
    const params: any = {
      source: { index: sourceIndex },
      dest: { index: destIndex },
      refresh: true,
    };
    
    if (query) {
      params.source.query = query;
    }

    const response = await this.elasticsearchService.reindex(params);

    this.logger.log(`Reindexed ${response.total} documents`);
    return response.total;
  }

  /**
   * Create index alias
   */
  async createAlias(index: string, alias: string): Promise<void> {
    await this.elasticsearchService.indices.putAlias({
      index,
      name: alias,
    });
    this.logger.log(`Created alias '${alias}' for index '${index}'`);
  }

  /**
   * Remove index alias
   */
  async removeAlias(index: string, alias: string): Promise<void> {
    await this.elasticsearchService.indices.deleteAlias({
      index,
      name: alias,
    });
    this.logger.log(`Removed alias '${alias}' from index '${index}'`);
  }

  /**
   * Check if index exists
   */
  async indexExists(index: string): Promise<boolean> {
    return await this.elasticsearchService.indices.exists({ index });
  }

  /**
   * Delete an index
   */
  async deleteIndex(index: string): Promise<void> {
    const exists = await this.indexExists(index);
    if (exists) {
      await this.elasticsearchService.indices.delete({ index });
      this.logger.log(`Deleted index '${index}'`);
    }
  }

  /**
   * Get index mapping
   */
  async getMapping(): Promise<any> {
    const response = await this.elasticsearchService.indices.getMapping({
      index: this.CONTENT_INDEX,
    });
    return response[this.CONTENT_INDEX].mappings;
  }

  /**
   * Update index mapping (only for new fields)
   */
  async updateMapping(properties: Record<string, any>): Promise<void> {
    await this.elasticsearchService.indices.putMapping({
      index: this.CONTENT_INDEX,
      properties,
    });
    this.logger.log('Index mapping updated');
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface BulkIndexResult {
  successful: number;
  failed: number;
  errors: Array<{ documentId: string; error: string }>;
}

export interface IndexStats {
  documentCount: number;
  sizeInBytes: number;
  indexRate: number;
  searchRate: number;
  segments: number;
}
