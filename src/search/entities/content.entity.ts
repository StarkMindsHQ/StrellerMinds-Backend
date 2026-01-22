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