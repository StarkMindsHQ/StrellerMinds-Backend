# Content Recommendation Engine Documentation

## Overview

The StrellerMinds Content Recommendation Engine is a comprehensive, AI-powered system that provides personalized learning recommendations and adaptive learning paths for users. It combines multiple recommendation algorithms including collaborative filtering, content-based filtering, and machine learning personalization to deliver highly relevant course suggestions.

## Architecture

### Core Components

1. **Recommendation Engine Service** - Main orchestrator for generating recommendations
2. **ML Personalization Service** - Machine learning-based personalization
3. **Content Similarity Service** - Content-based filtering algorithms
4. **Collaborative Filtering Service** - User-based and item-based collaborative filtering
5. **Learning Path Service** - Adaptive learning path generation
6. **Analytics Service** - Recommendation tracking and performance analytics
7. **Cache Service** - Performance optimization through intelligent caching
8. **Performance Optimization Service** - Batch processing and optimization

### Database Schema

#### Core Entities

- **Recommendation** - Individual recommendation records
- **LearningPath** - Structured learning sequences
- **LearningPathStep** - Individual steps within learning paths
- **UserInteraction** - User engagement tracking
- **RecommendationAnalytics** - Event tracking and metrics
- **RecommendationMetrics** - Aggregated performance data

## API Endpoints

### Recommendations

#### Get Personalized Recommendations

```http
GET /recommendations
```

**Query Parameters:**

- `type` (optional) - Filter by recommendation type
- `limit` (optional, default: 10) - Number of recommendations
- `offset` (optional, default: 0) - Pagination offset
- `minConfidence` (optional) - Minimum confidence score
- `sortBy` (optional, default: 'createdAt') - Sort field
- `sortOrder` (optional, default: 'DESC') - Sort direction

**Response:**

```json
{
  "recommendations": [
    {
      "id": "rec-123",
      "courseId": "course-456",
      "course": {
        "id": "course-456",
        "title": "Advanced React Development",
        "description": "Learn advanced React concepts",
        "difficulty": "intermediate",
        "duration": 120,
        "rating": 4.5,
        "tags": ["React", "JavaScript", "Frontend"],
        "skills": ["React", "Redux", "Hooks"]
      },
      "recommendationType": "CONTENT_BASED",
      "reason": "SKILL_BASED",
      "confidenceScore": 0.85,
      "relevanceScore": 0.8,
      "priority": 4,
      "explanation": "Recommended based on your React skills",
      "status": "ACTIVE",
      "createdAt": "2023-12-01T10:00:00Z"
    }
  ],
  "total": 25,
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

#### Generate New Recommendations

```http
POST /recommendations/generate
```

**Request Body:**

```json
{
  "limit": 10,
  "minConfidence": 0.1,
  "sessionId": "session-123",
  "deviceType": "desktop",
  "context": "homepage",
  "excludeCourseIds": ["course-789"],
  "includeReasons": ["SKILL_BASED", "SIMILAR_CONTENT"]
}
```

#### Record Interaction

```http
POST /recommendations/{id}/interact
```

**Request Body:**

```json
{
  "interactionType": "click",
  "metadata": {
    "source": "homepage",
    "position": 1
  }
}
```

#### Provide Feedback

```http
POST /recommendations/{id}/feedback
```

**Request Body:**

```json
{
  "score": 4,
  "feedbackType": "explicit",
  "comment": "Great recommendation!"
}
```

### Learning Paths

#### Get Learning Paths

```http
GET /learning-paths
```

#### Generate Learning Path

```http
POST /learning-paths/generate
```

**Request Body:**

```json
{
  "goal": {
    "targetSkills": ["React", "Redux", "Node.js"],
    "currentLevel": "beginner",
    "targetLevel": "intermediate",
    "timeframe": 8,
    "preferences": {
      "maxCoursesPerWeek": 2,
      "preferredDuration": 90,
      "includeTopics": ["Frontend", "Backend"]
    }
  },
  "options": {
    "maxCourses": 10,
    "includeAssessments": true,
    "includeProjects": true,
    "adaptToProgress": true
  }
}
```

#### Update Progress

```http
POST /learning-paths/{pathId}/steps/{stepId}/complete
```

## Usage Examples

### Basic Integration

```typescript
import { RecommendationEngineService } from './recommendation/services/recommendation-engine.service';

@Injectable()
export class CourseService {
  constructor(private recommendationService: RecommendationEngineService) {}

  async getCourseRecommendations(userId: string) {
    const recommendations = await this.recommendationService.generateRecommendations({
      userId,
      limit: 5,
      minConfidence: 0.3,
    });

    return recommendations.map((rec) => ({
      courseId: rec.courseId,
      reason: rec.explanation,
      confidence: rec.confidenceScore,
    }));
  }
}
```

### Learning Path Generation

```typescript
import { LearningPathService } from './recommendation/services/learning-path.service';

@Injectable()
export class LearningService {
  constructor(private learningPathService: LearningPathService) {}

  async createPersonalizedPath(userId: string, skills: string[]) {
    const goal = {
      targetSkills: skills,
      currentLevel: 'beginner' as const,
      targetLevel: 'intermediate' as const,
      timeframe: 12,
      preferences: {
        maxCoursesPerWeek: 2,
        preferredDuration: 90,
      },
    };

    const learningPath = await this.learningPathService.generateLearningPath(userId, goal);

    return learningPath;
  }
}
```

### Caching Implementation

```typescript
import { RecommendationCacheService } from './recommendation/services/recommendation-cache.service';

@Injectable()
export class OptimizedRecommendationService {
  constructor(
    private cacheService: RecommendationCacheService,
    private recommendationService: RecommendationEngineService,
  ) {}

  async getRecommendationsWithCache(userId: string) {
    // Try cache first
    const cached = await this.cacheService.getCachedRecommendations(userId, {
      userId,
      context: 'homepage',
    });

    if (cached) {
      return cached;
    }

    // Generate fresh recommendations
    const recommendations = await this.recommendationService.generateRecommendations({
      userId,
      limit: 10,
    });

    // Cache for future requests
    await this.cacheService.cacheRecommendations(
      userId,
      { userId, context: 'homepage' },
      recommendations,
    );

    return recommendations;
  }
}
```

### Analytics Integration

```typescript
import { RecommendationAnalyticsService } from './recommendation/services/recommendation-analytics.service';

@Injectable()
export class AnalyticsService {
  constructor(private analyticsService: RecommendationAnalyticsService) {}

  async getUserInsights(userId: string) {
    const analytics = await this.analyticsService.getUserAnalytics(userId, 30);

    return {
      totalRecommendations: analytics.totalRecommendationsReceived,
      engagementRate: analytics.totalInteractions / analytics.totalRecommendationsReceived,
      averageRating: analytics.averageFeedbackScore,
      topReasons: analytics.topRecommendationReasons,
    };
  }
}
```

## Configuration

### Environment Variables

```env
# Cache Configuration
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# ML Model Configuration
ML_MODEL_VERSION=v2.1
ML_CONFIDENCE_THRESHOLD=0.1

# Performance Settings
BATCH_SIZE=50
MAX_RECOMMENDATIONS=100
SIMILARITY_THRESHOLD=0.3

# Analytics
ANALYTICS_RETENTION_DAYS=90
METRICS_AGGREGATION_INTERVAL=3600
```

### Module Configuration

```typescript
@Module({
  imports: [
    RecommendationModule,
    CacheModule.register({
      ttl: 300,
      max: 1000,
    }),
    BullModule.registerQueue({
      name: 'recommendation-processing',
    }),
  ],
})
export class AppModule {}
```

## Performance Optimization

### Caching Strategy

1. **User Recommendations** - 5 minutes TTL
2. **User Profiles** - 30 minutes TTL
3. **Similarity Scores** - 1 hour TTL
4. **Learning Paths** - 10 minutes TTL
5. **Analytics Data** - 15 minutes TTL

### Batch Processing

```typescript
// Queue batch recommendation generation
await performanceService.batchGenerateRecommendations(userIds, {
  limit: 10,
  minConfidence: 0.1,
  refreshCache: false,
});

// Precompute similarity scores
await performanceService.precomputeSimilarityScores(popularCourseIds);

// Precompute user features
await performanceService.precomputeUserFeatures(activeUserIds);
```

### Circuit Breaker Pattern

```typescript
const recommendations = await performanceService.executeWithCircuitBreaker(
  'ml-service',
  () => mlService.generatePersonalizedRecommendations(context, options),
  {
    failureThreshold: 5,
    timeout: 10000,
    resetTimeout: 60000,
  },
);
```

## Monitoring and Analytics

### Key Metrics

1. **Click-Through Rate (CTR)** - Percentage of recommendations clicked
2. **Conversion Rate** - Percentage of clicks that lead to enrollments
3. **Average Rating** - User feedback scores
4. **Cache Hit Rate** - Percentage of requests served from cache
5. **Response Time** - Average API response time
6. **Error Rate** - Percentage of failed requests

### Performance Monitoring

```typescript
const metrics = await performanceService.collectPerformanceMetrics();

console.log({
  cacheHitRate: metrics.cacheHitRate,
  averageResponseTime: metrics.averageResponseTime,
  queueLength: metrics.queueLength,
  memoryUsage: metrics.memoryUsage,
  errorRate: metrics.errorRate,
});
```

### Scaling Recommendations

```typescript
const scaling = await performanceService.getScalingRecommendations();

if (scaling.scaleUp) {
  console.log(`Scale up recommended: ${scaling.reason}`);
  // Implement auto-scaling logic
}
```

## Testing

### Unit Tests

```typescript
describe('RecommendationEngineService', () => {
  it('should generate recommendations successfully', async () => {
    const recommendations = await service.generateRecommendations({
      userId: 'user-1',
      limit: 5,
    });

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeLessThanOrEqual(5);
    expect(recommendations[0]).toHaveProperty('confidenceScore');
  });
});
```

### Integration Tests

```typescript
describe('Recommendation API', () => {
  it('should return personalized recommendations', async () => {
    const response = await request(app.getHttpServer())
      .get('/recommendations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.recommendations).toBeDefined();
    expect(response.body.total).toBeGreaterThan(0);
  });
});
```

## Deployment

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendation-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: recommendation-service
  template:
    metadata:
      labels:
        app: recommendation-service
    spec:
      containers:
        - name: recommendation-service
          image: recommendation-service:latest
          ports:
            - containerPort: 3000
          env:
            - name: CACHE_TTL
              value: '300'
            - name: ML_MODEL_VERSION
              value: 'v2.1'
          resources:
            requests:
              memory: '512Mi'
              cpu: '250m'
            limits:
              memory: '1Gi'
              cpu: '500m'
```

## Troubleshooting

### Common Issues

1. **Low Recommendation Quality**
   - Check user interaction data completeness
   - Verify ML model training data quality
   - Review confidence thresholds

2. **Performance Issues**
   - Monitor cache hit rates
   - Check database query performance
   - Review batch processing queue lengths

3. **High Memory Usage**
   - Implement cache cleanup procedures
   - Optimize object references
   - Consider increasing cache TTL

### Debug Mode

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Check recommendation generation details
const recommendations = await service.generateRecommendations({
  userId: 'user-1',
  limit: 5,
  debug: true, // Enable detailed logging
});
```

## Best Practices

1. **Data Quality** - Ensure high-quality user interaction data
2. **A/B Testing** - Test different algorithms and parameters
3. **Feedback Loop** - Continuously collect and incorporate user feedback
4. **Performance Monitoring** - Monitor key metrics and optimize accordingly
5. **Graceful Degradation** - Handle service failures gracefully
6. **Privacy** - Respect user privacy and data protection regulations
7. **Scalability** - Design for horizontal scaling from the start

## Support

For technical support and questions:

- Check the troubleshooting section above
- Review the test files for usage examples
- Consult the API documentation for endpoint details
- Monitor application logs for error details

## Contributing

When contributing to the recommendation engine:

1. Write comprehensive tests for new features
2. Update documentation for API changes
3. Follow the established code style and patterns
4. Consider performance implications of changes
5. Test with realistic data volumes
