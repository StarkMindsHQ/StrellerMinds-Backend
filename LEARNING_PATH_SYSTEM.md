# Learning Path and Curriculum Designer System

## Overview

The Learning Path and Curriculum Designer is a comprehensive system that enables instructors to create structured learning journeys with visual curriculum building, dependency management, adaptive learning paths, and detailed analytics.

## Key Features

### 1. Visual Curriculum Builder
- Drag-and-drop interface for arranging learning nodes
- Intuitive node positioning and organization
- Real-time dependency visualization
- Template-based curriculum creation

### 2. Dependency Management
- Prerequisite relationships between learning nodes
- Corequisite (parallel) learning paths
- Conditional unlocking of content
- Cycle detection and validation

### 3. Adaptive Learning Engine
- Personalized content recommendations
- Performance-based path adjustments
- Intelligent next-node suggestions
- Completion time predictions

### 4. Learning Objective Mapping
- Bloom's taxonomy alignment
- Competency-based learning objectives
- Automatic objective suggestions
- Coverage gap analysis

### 5. Progress Tracking & Analytics
- Real-time progress monitoring
- Detailed engagement metrics
- Performance analytics dashboards
- Completion rate predictions

### 6. Template Library
- Pre-built curriculum templates
- Industry-standard learning paths
- Custom template creation and sharing
- Template instantiation with customization

## System Architecture

### Entities

#### LearningPath
Main container for a complete learning journey
- Title and description
- Learning path type (Linear, Adaptive, Custom)
- Status (Draft, Published, Archived)
- Metadata and duration tracking

#### LearningPathNode
Individual learning units within a path
- Node types: Course, Module, Assessment, Project, Milestone
- Position and duration tracking
- Prerequisite relationships
- Linked learning objectives

#### NodeDependency
Relationships between learning nodes
- Dependency types: Prerequisite, Corequisite, Recommended, Unlocks
- Conditional requirements
- Validation rules

#### LearningObjective
Educational goals and competencies
- Objective types: Knowledge, Skill, Competency, Certification
- Difficulty levels and domains
- Bloom's taxonomy classification

#### LearningPathEnrollment
Student enrollment and progress tracking
- Enrollment status and dates
- Overall progress percentage
- Learning preferences and metadata

#### NodeProgress
Detailed progress for individual nodes
- Completion status and percentages
- Time spent and assessment scores
- Attempt tracking and metadata

#### LearningPathTemplate
Reusable curriculum templates
- Template categories and structure
- Public/private sharing options
- Usage statistics and versioning

### Services

#### CurriculumBuilderService
Handles curriculum creation and management:
- Learning path CRUD operations
- Node creation and positioning
- Dependency management
- Graph validation and cycle detection

#### AdaptiveLearningService
Manages personalized learning experiences:
- Next node recommendations
- Performance metric analysis
- Path adaptation algorithms
- Completion predictions

#### ObjectiveMappingService
Handles learning objective integration:
- Objective CRUD operations
- Node-objective mapping
- Coverage analysis
- Automatic suggestions

#### ProgressTrackingService
Manages enrollment and progress tracking:
- User enrollment workflows
- Progress updates and calculations
- Analytics and reporting
- Learning history management

#### TemplateLibraryService
Manages curriculum templates:
- Template creation and management
- Template instantiation
- Search and discovery
- Standard template library

## API Endpoints

### Learning Path Management
```
POST   /learning-paths                  # Create new learning path
GET    /learning-paths                  # Get all learning paths
GET    /learning-paths/:id             # Get learning path details
PUT    /learning-paths/:id             # Update learning path
DELETE /learning-paths/:id             # Delete learning path
```

### Node Management
```
POST   /learning-paths/:id/nodes       # Add node to learning path
DELETE /learning-paths/nodes/:nodeId   # Remove node from learning path
POST   /learning-paths/nodes/:nodeId/dependencies  # Create dependency
GET    /learning-paths/:id/dependency-graph        # Get dependency visualization
GET    /learning-paths/:id/validate-dependencies   # Validate dependencies
```

### Adaptive Learning
```
GET    /learning-paths/enrollments/:enrollmentId/next-node  # Get recommendation
GET    /learning-paths/enrollments/:enrollmentId/performance # Get performance metrics
GET    /learning-paths/enrollments/:enrollmentId/completion-prediction # Prediction
```

### Progress Tracking
```
POST   /learning-paths/enroll                  # Enroll user
POST   /learning-paths/enrollments/:enrollmentId/progress  # Update progress
GET    /learning-paths/users/:userId/progress/:learningPathId  # Get user progress
GET    /learning-paths/:id/analytics           # Get analytics report
GET    /learning-paths/users/:userId/history   # Get learning history
```

### Learning Objectives
```
POST   /learning-paths/objectives          # Create objective
GET    /learning-paths/objectives          # Get objectives
POST   /learning-paths/nodes/:nodeId/objectives  # Map objectives to node
GET    /learning-paths/nodes/:nodeId/objectives  # Get node objectives
GET    /learning-paths/:id/objective-coverage    # Get coverage report
```

### Template Library
```
POST   /learning-paths/templates           # Create template
GET    /learning-paths/templates           # Get templates
GET    /learning-paths/templates/:id      # Get template details
POST   /learning-paths/templates/:id/instantiate  # Create path from template
GET    /learning-paths/templates/popular   # Get popular templates
GET    /learning-paths/my/templates        # Get user templates
```

## Implementation Details

### Dependency Graph Algorithm
The system uses a directed acyclic graph (DAG) approach for dependency management:
- Topological sorting for learning path ordering
- Cycle detection using depth-first search
- Reachability analysis for path validation
- Critical path identification for duration estimation

### Adaptive Learning Algorithm
The recommendation engine considers multiple factors:
- Student performance history
- Learning objective alignment
- Content difficulty matching
- Engagement patterns and timing
- Prerequisite satisfaction

### Progress Calculation
Progress tracking uses weighted completion metrics:
- Node completion status weights
- Time-spent normalization
- Assessment score integration
- Overall path progression calculation

## Database Schema

The system creates the following tables:
- `learning_paths` - Main learning path containers
- `learning_path_nodes` - Individual learning units
- `node_dependencies` - Relationships between nodes
- `learning_objectives` - Educational goals
- `learning_path_enrollments` - Student enrollments
- `node_progress` - Detailed progress tracking
- `learning_path_templates` - Curriculum templates
- Junction tables for many-to-many relationships

## Security Considerations

- Role-based access control (Instructor/Admin roles)
- JWT authentication for all endpoints
- Data isolation by instructor ownership
- Input validation and sanitization
- Rate limiting for API endpoints

## Future Enhancements

### Planned Features
- Integration with external LMS platforms
- AI-powered content recommendations
- Collaborative curriculum design
- Mobile-responsive interface
- Offline learning support
- Social learning features
- Certification and credentialing
- Marketplace for premium templates

### Technical Improvements
- Real-time collaboration features
- Advanced analytics and reporting
- Machine learning model training
- Performance optimization
- Scalability enhancements
- Enhanced visualization tools

## Getting Started

### Installation
1. Run the database migration: `npm run migration:run`
2. The learning path module is automatically registered in AppModule
3. Access endpoints via `/learning-paths` base path

### Quick Start Guide
1. Create a learning path template or start from scratch
2. Add learning nodes (courses, assessments, projects)
3. Define dependencies between nodes
4. Map learning objectives to content
5. Publish and enroll students
6. Monitor progress and adapt as needed

## Example Usage

### Creating a Learning Path
```typescript
const learningPath = await curriculumBuilderService.createLearningPath(userId, {
  title: "Full-Stack Developer Bootcamp",
  description: "Comprehensive path to become a full-stack developer",
  type: "adaptive",
  status: "draft",
  nodes: [
    {
      type: "course",
      title: "HTML & CSS Fundamentals",
      position: 0,
      estimatedDurationHours: 20
    },
    {
      type: "course", 
      title: "JavaScript Essentials",
      position: 1,
      estimatedDurationHours: 30,
      prerequisites: ["node-1-id"]
    }
  ]
});
```

### Enrolling a Student
```typescript
const enrollment = await progressTrackingService.enrollUser(userId, learningPathId);
```

### Updating Progress
```typescript
await progressTrackingService.updateProgress(enrollmentId, {
  nodeId: "node-1-id",
  status: "completed",
  completionPercentage: 100,
  score: 85,
  timeSpentMinutes: 120
});
```

### Getting Recommendations
```typescript
const recommendation = await adaptiveLearningService.getNextRecommendedNode(enrollmentId);
```

This comprehensive system provides a robust foundation for creating, managing, and delivering structured learning experiences with adaptive intelligence and detailed analytics.