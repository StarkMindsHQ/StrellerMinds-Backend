# AI & Recommendation Module

## Overview
The AI module provides intelligent features to the StrellerMinds platform, including personalized content recommendations, learning pattern analysis, and an intelligent tutoring system.

## Components

### 1. Content Recommendation Engine
Uses a hybrid approach (Collaborative Filtering + Content-Based) to suggest the most relevant learning materials.
- **Service**: `ContentRecommendationService`
- **Features**:
  - Personalized course suggestions
  - A/B testing support for algorithms
  - Engagement tracking for RLHF (Reinforcement Learning from Human Feedback)

### 2. Learning Pattern Analysis
Analyzes user behavior to categorize learning styles and detect at-risk students.
- **Service**: `LearningPatternAnalysisService`
- **Patterns Detected**:
  - `binge_learner`: Consumes large amounts of content in short bursts.
  - `consistent`: Regular, steady progress.
  - `struggling`: Low scores or high time-on-task.
  - `weekend_warrior`: Active primarily on weekends.

### 3. Intelligent Tutor
Provides context-aware answers to student queries about course material.
- **Service**: `IntelligentTutoringService`
- **Capabilities**:
  - Intent detection (Explanation vs Example vs Assessment)
  - Context-aware responses
  - Follow-up suggestions

## API Endpoints

- `GET /api/ai/recommendations/:userId` - Get content suggestions
- `GET /api/ai/patterns/:userId` - Get user learning analysis
- `POST /api/ai/tutor/query` - Ask the AI tutor a question
- `POST /api/ai/recommendations/track` - Log interaction for model training

## Integration

Import `AiModule` in `AppModule`:

```typescript
import { AiModule } from './ai/ai.module';

@Module({
  imports: [AiModule, ...],
})
export class AppModule {}
```