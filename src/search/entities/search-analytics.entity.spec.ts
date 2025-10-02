import { validate } from 'class-validator';
import { SearchAnalytics } from './search-analytics.entity';

describe('SearchAnalytics Entity', () => {
  let searchAnalytics: SearchAnalytics;

  beforeEach(() => {
    searchAnalytics = new SearchAnalytics();
  });

  it('should create a valid search analytics entity', async () => {
    searchAnalytics.query = 'stellar blockchain';
    searchAnalytics.userId = 'user123';
    searchAnalytics.resultsCount = 5;
    searchAnalytics.clickedResults = ['course1', 'course2'];
    searchAnalytics.searchedAt = new Date();

    const errors = await validate(searchAnalytics);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for empty query', async () => {
    searchAnalytics.query = '';
    searchAnalytics.userId = 'user123';
    searchAnalytics.resultsCount = 5;

    const errors = await validate(searchAnalytics);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('query');
  });

  it('should fail validation for negative results count', async () => {
    searchAnalytics.query = 'stellar';
    searchAnalytics.userId = 'user123';
    searchAnalytics.resultsCount = -1;

    const errors = await validate(searchAnalytics);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('resultsCount');
  });

  it('should allow null userId for anonymous searches', async () => {
    searchAnalytics.query = 'stellar';
    searchAnalytics.userId = null;
    searchAnalytics.resultsCount = 5;

    const errors = await validate(searchAnalytics);
    expect(errors).toHaveLength(0);
  });

  it('should initialize with default values', () => {
    expect(searchAnalytics.clickedResults).toEqual([]);
    expect(searchAnalytics.searchedAt).toBeInstanceOf(Date);
  });

  it('should handle clicked results array', () => {
    searchAnalytics.clickedResults = ['course1', 'course2', 'course3'];
    expect(searchAnalytics.clickedResults).toHaveLength(3);
    expect(searchAnalytics.clickedResults).toContain('course1');
  });
});
