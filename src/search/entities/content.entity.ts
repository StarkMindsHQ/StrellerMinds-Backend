export interface ContentDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  difficulty: string;
  duration: number;
  author: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  rating: number;
}

export const CONTENT_INDEX_MAPPING = {
  properties: {
    title: { type: 'text', analyzer: 'english', boost: 2.0 },
    description: { type: 'text', analyzer: 'english' },
    content: { type: 'text', analyzer: 'english' },
    category: { type: 'keyword' },
    difficulty: { type: 'keyword' },
    tags: { type: 'keyword' },
    author: { type: 'keyword' },
    createdAt: { type: 'date' },
    viewCount: { type: 'integer' },
    rating: { type: 'float' },
    vectors: { type: 'dense_vector', dims: 768, index: true, similarity: 'cosine' } // For future vector search
  }
};

export interface SearchAnalytics {
  id: string;
  userId: string;
  query: string;
  filters: Record<string, any>;
  resultsCount: number;
  clickedResults: string[];
  timestamp: Date;
  duration: number;
}

export interface UserPreference {
  userId: string;
  categories: string[];
  difficulty: string[];
  searchHistory: string[];
  clickedItems: string[];
  lastUpdated: Date;
}
