import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { Course } from '../../courses/entities/course.entity';

@Injectable()
export class SearchMLService {
  private readonly logger = new Logger(SearchMLService.name);
  private readonly embeddingApiUrl: string;
  private readonly embeddingApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.embeddingApiUrl = this.configService.get<string>(
      'EMBEDDING_API_URL',
      'https://api.openai.com/v1/embeddings',
    );
    this.embeddingApiKey = this.configService.get<string>('EMBEDDING_API_KEY', '');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.embeddingApiKey) {
        this.logger.warn('Embedding API key not configured, returning zero vector');
        return new Array(384).fill(0);
      }

      const response = await firstValueFrom(
        this.httpService.post(
          this.embeddingApiUrl,
          {
            input: text,
            model: 'text-embedding-ada-002',
          },
          {
            headers: {
              Authorization: `Bearer ${this.embeddingApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.data[0].embedding;
    } catch (error) {
      this.logger.error('Generate embedding failed', error);
      // Return zero vector as fallback
      return new Array(384).fill(0);
    }
  }

  async generateCourseEmbedding(course: Course): Promise<number[]> {
    try {
      // Combine course information into a single text for embedding
      const courseText = [
        course.title,
        course.description,
        course.content || '',
        course.category,
        course.level,
        course.instructor,
        ...(course.tags || []),
        ...(course.skills || []),
      ]
        .filter(Boolean)
        .join(' ');

      return await this.generateEmbedding(courseText);
    } catch (error) {
      this.logger.error('Generate course embedding failed', error);
      return new Array(384).fill(0);
    }
  }

  async classifySearchIntent(query: string): Promise<{
    intent: 'learning' | 'browsing' | 'specific' | 'comparison';
    confidence: number;
    entities: string[];
  }> {
    try {
      // Simple rule-based classification (can be enhanced with ML models)
      const lowerQuery = query.toLowerCase();

      // Learning intent keywords
      const learningKeywords = [
        'learn',
        'tutorial',
        'course',
        'training',
        'study',
        'master',
        'beginner',
        'advanced',
      ];
      const browsingKeywords = ['explore', 'discover', 'find', 'show', 'list', 'browse'];
      const specificKeywords = ['stellar', 'blockchain', 'smart contract', 'cryptocurrency'];
      const comparisonKeywords = ['vs', 'versus', 'compare', 'difference', 'better', 'best'];

      let intent: 'learning' | 'browsing' | 'specific' | 'comparison' = 'browsing';
      let confidence = 0.5;

      if (comparisonKeywords.some((keyword) => lowerQuery.includes(keyword))) {
        intent = 'comparison';
        confidence = 0.8;
      } else if (learningKeywords.some((keyword) => lowerQuery.includes(keyword))) {
        intent = 'learning';
        confidence = 0.7;
      } else if (specificKeywords.some((keyword) => lowerQuery.includes(keyword))) {
        intent = 'specific';
        confidence = 0.6;
      }

      // Extract entities (simplified)
      const entities = specificKeywords.filter((keyword) => lowerQuery.includes(keyword));

      return { intent, confidence, entities };
    } catch (error) {
      this.logger.error('Classify search intent failed', error);
      return { intent: 'browsing', confidence: 0.5, entities: [] };
    }
  }

  async generateSearchSuggestions(query: string, limit = 5): Promise<string[]> {
    try {
      // Generate contextual search suggestions based on query
      const suggestions: string[] = [];
      const lowerQuery = query.toLowerCase();

      // Predefined suggestion patterns
      const suggestionPatterns = {
        stellar: [
          'stellar blockchain development',
          'stellar smart contracts',
          'stellar lumens trading',
          'stellar network architecture',
          'stellar consensus protocol',
        ],
        blockchain: [
          'blockchain fundamentals',
          'blockchain development',
          'blockchain security',
          'blockchain applications',
          'blockchain consensus',
        ],
        'smart contract': [
          'smart contract development',
          'smart contract security',
          'smart contract testing',
          'smart contract deployment',
          'smart contract auditing',
        ],
        cryptocurrency: [
          'cryptocurrency trading',
          'cryptocurrency mining',
          'cryptocurrency wallets',
          'cryptocurrency regulations',
          'cryptocurrency investing',
        ],
      };

      // Find matching patterns
      Object.keys(suggestionPatterns).forEach((key) => {
        if (lowerQuery.includes(key)) {
          suggestions.push(...suggestionPatterns[key]);
        }
      });

      // Remove duplicates and limit results
      const uniqueSuggestions = [...new Set(suggestions)];
      return uniqueSuggestions.slice(0, limit);
    } catch (error) {
      this.logger.error('Generate search suggestions failed', error);
      return [];
    }
  }

  async analyzeSearchPerformance(
    searchResults: any[],
    userInteractions: any[],
  ): Promise<{
    relevanceScore: number;
    clickThroughRate: number;
    averagePosition: number;
    recommendations: string[];
  }> {
    try {
      if (searchResults.length === 0) {
        return {
          relevanceScore: 0,
          clickThroughRate: 0,
          averagePosition: 0,
          recommendations: ['Improve search query specificity'],
        };
      }

      // Calculate click-through rate
      const totalClicks = userInteractions.length;
      const clickThroughRate = totalClicks / searchResults.length;

      // Calculate average position of clicked results
      const clickedPositions = userInteractions.map((interaction) => {
        const position = searchResults.findIndex((result) => result.id === interaction.courseId);
        return position >= 0 ? position + 1 : searchResults.length;
      });

      const averagePosition =
        clickedPositions.length > 0
          ? clickedPositions.reduce((sum, pos) => sum + pos, 0) / clickedPositions.length
          : searchResults.length;

      // Calculate relevance score based on various factors
      const relevanceScore = Math.max(
        0,
        Math.min(
          1,
          clickThroughRate * 0.4 +
            ((searchResults.length - averagePosition) / searchResults.length) * 0.3 +
            (searchResults.filter((r) => r.score > 1).length / searchResults.length) * 0.3,
        ),
      );

      // Generate recommendations
      const recommendations: string[] = [];

      if (clickThroughRate < 0.1) {
        recommendations.push('Consider improving result relevance');
      }

      if (averagePosition > 5) {
        recommendations.push('Top results may not be relevant enough');
      }

      if (relevanceScore < 0.5) {
        recommendations.push('Search algorithm may need tuning');
      }

      return {
        relevanceScore,
        clickThroughRate,
        averagePosition,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Analyze search performance failed', error);
      return {
        relevanceScore: 0,
        clickThroughRate: 0,
        averagePosition: 0,
        recommendations: ['Error analyzing performance'],
      };
    }
  }
}
