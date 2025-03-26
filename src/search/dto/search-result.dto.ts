/* eslint-disable prettier/prettier */

export class SearchResultItemDto {
  id: string;
  type: 'course' | 'forum' | 'user';
  title: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  relevanceScore: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class FacetValueDto {
  value: string;
  count: number;
}

export class FacetDto {
  name: string;
  values: FacetValueDto[];
}

export class SearchResultDto {
  items: SearchResultItemDto[];
  total: number;
  page: number;
  limit: number;
  facets: FacetDto[];
  suggestions?: string[];
  processingTimeMs: number;
}
