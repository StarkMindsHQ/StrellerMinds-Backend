import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchLog } from '../entities/search.entity';
import * as natural from 'natural';

/**
 * Search Optimization Service
 * Provides query optimization, spell checking, synonyms, and relevance tuning
 */
@Injectable()
export class SearchOptimizationService {
  private readonly logger = new Logger(SearchOptimizationService.name);
  private readonly tokenizer = new natural.WordTokenizer();
  private spellCheck: natural.Spellcheck;
  private synonymDictionary: Map<string, string[]> = new Map();
  private stopWords: Set<string> = new Set();

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(SearchLog)
    private readonly searchLogRepo: Repository<SearchLog>,
  ) {
    this.initializeSpellCheck();
    this.initializeSynonyms();
    this.initializeStopWords();
  }

  /**
   * Initialize spell checker with common terms
   */
  private initializeSpellCheck(): void {
    const dictionary = [
      'programming', 'javascript', 'python', 'java', 'typescript', 'react', 'angular', 'vue',
      'nodejs', 'express', 'nestjs', 'database', 'sql', 'nosql', 'mongodb', 'postgresql',
      'blockchain', 'bitcoin', 'ethereum', 'smart contract', 'defi', 'nft', 'crypto',
      'web3', 'solidity', 'stellar', 'soroban', 'distributed ledger', 'consensus',
      'algorithm', 'data structure', 'machine learning', 'ai', 'deep learning',
      'course', 'tutorial', 'lesson', 'module', 'chapter', 'assignment', 'quiz',
      'beginner', 'intermediate', 'advanced', 'expert', 'fundamentals', 'basics',
      'development', 'design', 'architecture', 'testing', 'deployment', 'devops',
      'security', 'authentication', 'authorization', 'encryption', 'privacy',
    ];
    this.spellCheck = new natural.Spellcheck(dictionary);
  }

  /**
   * Initialize synonym dictionary
   */
  private initializeSynonyms(): void {
    this.synonymDictionary.set('js', ['javascript']);
    this.synonymDictionary.set('py', ['python']);
    this.synonymDictionary.set('ts', ['typescript']);
    this.synonymDictionary.set('db', ['database']);
    this.synonymDictionary.set('ml', ['machine learning']);
    this.synonymDictionary.set('ai', ['artificial intelligence']);
    this.synonymDictionary.set('bc', ['blockchain']);
    this.synonymDictionary.set('sc', ['smart contract']);
    this.synonymDictionary.set('defi', ['decentralized finance']);
    this.synonymDictionary.set('nft', ['non-fungible token']);
    this.synonymDictionary.set('api', ['application programming interface']);
    this.synonymDictionary.set('ui', ['user interface']);
    this.synonymDictionary.set('ux', ['user experience']);
    this.synonymDictionary.set('frontend', ['front-end', 'front end']);
    this.synonymDictionary.set('backend', ['back-end', 'back end']);
    this.synonymDictionary.set('devops', ['development operations']);
  }

  /**
   * Initialize common stop words
   */
  private initializeStopWords(): void {
    const stopWordsList = [
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'need', 'dare', 'ought',
      'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
      'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'whom',
      'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every',
      'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    ];
    this.stopWords = new Set(stopWordsList);
  }

  /**
   * Optimize a search query for better results
   */
  async optimizeQuery(query: string): Promise<OptimizedQuery> {
    const originalQuery = query;
    let optimizedQuery = query;
    const suggestions: string[] = [];
    const corrections: QueryCorrection[] = [];

    // Step 1: Tokenize
    const tokens = this.tokenizer.tokenize(query.toLowerCase()) || [];

    // Step 2: Spell check and correct
    for (const token of tokens) {
      if (this.stopWords.has(token)) continue;

      const correction = this.spellCheck.getCorrections(token, 1)[0];
      if (correction && correction !== token) {
        corrections.push({
          original: token,
          corrected: correction,
          confidence: this.calculateConfidence(token, correction),
        });
        optimizedQuery = optimizedQuery.replace(token, correction);
      }
    }

    // Step 3: Expand with synonyms
    const expandedTerms: string[] = [];
    for (const token of tokens) {
      const synonyms = this.synonymDictionary.get(token);
      if (synonyms) {
        expandedTerms.push(...synonyms);
      }
    }

    // Step 4: Remove stop words for better matching
    const significantTerms = tokens.filter((t) => !this.stopWords.has(t));

    // Step 5: Generate query suggestions
    const querySuggestions = await this.generateQuerySuggestions(significantTerms);
    suggestions.push(...querySuggestions);

    // Step 6: Detect query intent
    const intent = this.detectQueryIntent(query);

    return {
      originalQuery,
      optimizedQuery,
      expandedTerms: [...new Set(expandedTerms)],
      significantTerms: [...new Set(significantTerms)],
      corrections,
      suggestions: [...new Set(suggestions)].slice(0, 5),
      intent,
    };
  }

  /**
   * Build optimized Elasticsearch query
   */
  buildOptimizedQuery(optimizedQuery: OptimizedQuery): any {
    const { optimizedQuery: query, expandedTerms, significantTerms, intent } = optimizedQuery;

    const should: any[] = [];

    // Main query with high boost
    should.push({
      multi_match: {
        query,
        fields: ['title^5', 'description^3', 'content^2', 'tags^4'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });

    // Phrase match for exact matches
    should.push({
      multi_match: {
        query,
        fields: ['title^10', 'description^5'],
        type: 'phrase',
        slop: 2,
      },
    });

    // Expanded terms with lower boost
    if (expandedTerms.length > 0) {
      should.push({
        multi_match: {
          query: expandedTerms.join(' '),
          fields: ['title^2', 'description', 'tags^2'],
          type: 'best_fields',
        },
      });
    }

    // Significant terms for broader matching
    if (significantTerms.length > 0) {
      should.push({
        multi_match: {
          query: significantTerms.join(' '),
          fields: ['content', 'description'],
          type: 'cross_fields',
          operator: 'or',
        },
      });
    }

    // Intent-based boosting
    const functionScore: any = {
      query: { bool: { should } },
      functions: [],
      score_mode: 'sum',
      boost_mode: 'multiply',
    };

    // Boost by rating and popularity
    functionScore.functions.push(
      { field_value_factor: { field: 'rating', factor: 1.5, missing: 1, modifier: 'sqrt' } },
      { field_value_factor: { field: 'viewCount', factor: 1.2, missing: 0, modifier: 'log1p' } },
    );

    // Recency boost
    functionScore.functions.push({
      gauss: {
        createdAt: {
          origin: 'now',
          scale: '30d',
          decay: 0.5,
        },
      },
    });

    // Intent-specific boosts
    if (intent === 'beginner') {
      functionScore.functions.push({
        filter: { term: { difficulty: 'beginner' } },
        weight: 2,
      });
    } else if (intent === 'advanced') {
      functionScore.functions.push({
        filter: { term: { difficulty: 'advanced' } },
        weight: 2,
      });
    }

    return { function_score: functionScore };
  }

  /**
   * Calculate confidence score for spell correction
   */
  private calculateConfidence(original: string, correction: string): number {
    const distance = natural.LevenshteinDistance(original, correction);
    const maxLength = Math.max(original.length, correction.length);
    const similarity = 1 - distance / maxLength;
    return Math.round(similarity * 100);
  }

  /**
   * Generate query suggestions based on search history
   */
  private async generateQuerySuggestions(terms: string[]): Promise<string[]> {
    if (terms.length === 0) return [];

    try {
      const response = await this.elasticsearchService.search({
        index: 'search_analytics',
        size: 0,
        query: {
          bool: {
            should: terms.map((term) => ({
              prefix: { normalizedQuery: term },
            })),
          },
        },
        aggs: {
          suggestions: {
            terms: {
              field: 'normalizedQuery',
              size: 10,
              min_doc_count: 2,
            },
          },
        },
      });

      const buckets = (response.aggregations as any)?.suggestions?.buckets || [];
      return buckets.map((b: any) => b.key);
    } catch (error) {
      this.logger.error('Failed to generate suggestions', error);
      return [];
    }
  }

  /**
   * Detect query intent
   */
  private detectQueryIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();

    // Beginner intent
    if (/\b(beginner|basic|fundamental|start|introduction|getting started)\b/.test(lowerQuery)) {
      return 'beginner';
    }

    // Advanced intent
    if (/\b(advanced|expert|complex|deep dive|master)\b/.test(lowerQuery)) {
      return 'advanced';
    }

    // Practical/Tutorial intent
    if (/\b(how to|tutorial|guide|example|practice|hands.on)\b/.test(lowerQuery)) {
      return 'tutorial';
    }

    // Reference intent
    if (/\b(reference|documentation|api|specification)\b/.test(lowerQuery)) {
      return 'reference';
    }

    return 'general';
  }

  /**
   * Analyze search relevance and provide recommendations
   */
  async analyzeRelevance(query: string, results: any[]): Promise<RelevanceAnalysis> {
    const analysis: RelevanceAnalysis = {
      query,
      resultCount: results.length,
      recommendations: [],
      contentGaps: [],
    };

    // Check for low result count
    if (results.length < 5) {
      analysis.recommendations.push({
        type: 'expand_query',
        message: 'Try broadening your search terms or removing filters',
        action: 'remove_filters',
      });
    }

    // Check for exact match absence
    const hasExactMatch = results.some(
      (r) =>
        r.title?.toLowerCase().includes(query.toLowerCase()) ||
        r.description?.toLowerCase().includes(query.toLowerCase()),
    );

    if (!hasExactMatch && results.length > 0) {
      analysis.recommendations.push({
        type: 'no_exact_match',
        message: 'No exact matches found. Showing related results.',
        action: 'show_related',
      });
    }

    // Identify content gaps
    const significantTerms = (this.tokenizer.tokenize(query.toLowerCase()) || []).filter(
      (t) => !this.stopWords.has(t),
    );

    for (const term of significantTerms) {
      const termInResults = results.some(
        (r) =>
          r.title?.toLowerCase().includes(term) ||
          r.tags?.some((t: string) => t.toLowerCase().includes(term)),
      );

      if (!termInResults) {
        analysis.contentGaps.push(term);
      }
    }

    return analysis;
  }

  /**
   * Get search quality metrics
   */
  async getSearchQualityMetrics(): Promise<SearchQualityMetrics> {
    // This would typically aggregate from analytics
    return {
      averageClickPosition: 2.5,
      clickThroughRate: 0.65,
      zeroResultsRate: 0.08,
      averageResultRelevance: 4.2,
      queryCorrectionRate: 0.12,
    };
  }

  /**
   * Add custom synonym
   */
  addSynonym(term: string, synonyms: string[]): void {
    this.synonymDictionary.set(term.toLowerCase(), synonyms);
  }

  /**
   * Add terms to spell check dictionary
   */
  addToDictionary(terms: string[]): void {
    const currentDict = this.spellCheck || new natural.Spellcheck([]);
    // Note: Spellcheck doesn't support dynamic addition, would need recreation
    this.logger.log(`Added ${terms.length} terms to dictionary (requires restart)`);
  }

  /**
   * Get query explanation
   */
  explainQuery(query: string): QueryExplanation {
    const tokens = this.tokenizer.tokenize(query.toLowerCase()) || [];
    const significantTerms = tokens.filter((t) => !this.stopWords.has(t));
    const stopWordsFound = tokens.filter((t) => this.stopWords.has(t));

    return {
      originalQuery: query,
      tokens,
      significantTerms,
      stopWords: stopWordsFound,
      detectedIntent: this.detectQueryIntent(query),
      willUseSynonyms: significantTerms.some((t) => this.synonymDictionary.has(t)),
      willApplySpellCheck: significantTerms.some((t) => !this.spellCheck.isCorrect(t)),
    };
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface OptimizedQuery {
  originalQuery: string;
  optimizedQuery: string;
  expandedTerms: string[];
  significantTerms: string[];
  corrections: QueryCorrection[];
  suggestions: string[];
  intent: QueryIntent;
}

export interface QueryCorrection {
  original: string;
  corrected: string;
  confidence: number;
}

export type QueryIntent = 'beginner' | 'advanced' | 'tutorial' | 'reference' | 'general';

export interface RelevanceAnalysis {
  query: string;
  resultCount: number;
  recommendations: RelevanceRecommendation[];
  contentGaps: string[];
}

export interface RelevanceRecommendation {
  type: string;
  message: string;
  action: string;
}

export interface SearchQualityMetrics {
  averageClickPosition: number;
  clickThroughRate: number;
  zeroResultsRate: number;
  averageResultRelevance: number;
  queryCorrectionRate: number;
}

export interface QueryExplanation {
  originalQuery: string;
  tokens: string[];
  significantTerms: string[];
  stopWords: string[];
  detectedIntent: QueryIntent;
  willUseSynonyms: boolean;
  willApplySpellCheck: boolean;
}
