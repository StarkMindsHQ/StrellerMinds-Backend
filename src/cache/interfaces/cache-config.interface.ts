export interface CacheConfig {
  ttl: number; 
  max?: number; 
  strategy?: CacheStrategy;
  keyPrefix?: string;
  invalidateOn?: string[]; 
  condition?: (context: any) => boolean; 

export interface CacheKeyOptions {
  prefix?: string;
  suffix?: string;
  includeQuery?: boolean;
  includeHeaders?: string[];
  includeBody?: boolean;
  customKey?: (context: any) => string;
}

export interface CacheInvalidationOptions {
  patterns?: string[];
  tags?: string[];
  cascade?: boolean;
}