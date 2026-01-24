# User Profiles Feature Documentation

## Overview

This comprehensive user profiles feature enables platform users to create rich, customizable profiles with portfolios, achievements, social networking capabilities, and advanced privacy controls. The system is built with enterprise-level security, scalability, and user experience in mind.

## Key Features

### 1. Detailed User Profiles
- **Customizable Profiles**: Bio, headline, location, skills, specialization, years of experience
- **Media Support**: Profile photo, cover photo, and social links
- **Profile Completion Tracking**: Percentage-based completion metrics
- **Theme Customization**: Primary color, accent color, and layout preferences
- **Visibility Controls**: Show/hide badges, portfolio, and activity

### 2. Portfolio Management
- **Multiple Portfolio Types**:
  - Projects
  - Certificates
  - Achievements
  - Publications
  - Courses
- **Rich Content**: Title, description, images, links, technologies, tags
- **Featured Items**: Highlight best work
- **Organization**: Drag-and-drop reordering
- **Analytics**: View counts, click tracking
- **Privacy Control**: Public/private portfolio items
- **Date Tracking**: Start and end dates for projects/courses

### 3. Achievement & Badge System
- **Pre-built Badges**:
  - Learning badges
  - Achievement badges
  - Participation badges
  - Skill-based badges
  - Milestone badges
- **Rarity Levels**: 5-level rarity system for badge value
- **Badge Management**: Award, display, hide badges
- **Progress Tracking**: Badge level progression
- **Leaderboard**: Global achievement rankings
- **Statistics**: Category breakdown, rare badge counts

### 4. Social Features
- **Following System**: Build network of connections
- **Followers/Following Lists**: View and manage connections
- **Mutual Connections**: Find common connections with other users
- **Suggested Users**: AI-based recommendations
- **Blocking**: Block users to prevent interaction
- **Muting**: Mute users without unfollowing
- **Social Stats**: Followers, following, mutual connections counts
- **Network Discovery**: Suggestions based on mutual connections

### 5. Privacy Controls
- **Granular Visibility Settings**:
  - Profile visibility (public, private, friends-only)
  - Portfolio visibility
  - Badge visibility
  - Activity visibility
- **Communication Controls**:
  - Allow/disallow messaging
  - Allow/disallow following
  - Allow/disallow mentions
- **Discovery Settings**:
  - Show in search
  - Show in recommendations
- **Data Sharing**:
  - Activity feed sharing
  - Analytics sharing
  - Third-party integration controls
- **Notification Preferences**:
  - Email notifications
  - Push notifications
  - Marketing emails
- **User Management**:
  - Block users list
  - Mute users list
- **Data Export**: GDPR-compliant data export

### 6. Profile Analytics
- **View Metrics**:
  - Total views
  - Daily/weekly/monthly views
  - Recent viewers
- **Engagement Metrics**:
  - Followers gained/lost
  - Portfolio items views and clicks
  - Badge displays
- **Traffic Analysis**:
  - Traffic sources (direct, search, social, referral)
  - Device types (mobile, tablet, desktop)
  - Top countries
- **Session Data**: Average session duration, last viewed date

## API Endpoints

### Profile Management

#### Get/Update Profile
```
GET    /api/profiles/me              # Current user profile
GET    /api/profiles/me/full         # Full profile with details
PUT    /api/profiles/me              # Update profile
GET    /api/profiles/:userId/profile # Get user profile
GET    /api/profiles/:profileId      # Get profile by ID
```

#### Profile Analytics
```
GET    /api/profiles/:profileId/analytics  # Get analytics (owner only)
GET    /api/profiles/me/achievements/stats # Achievement stats
```

### Portfolio Management

#### CRUD Operations
```
POST   /api/profiles/me/portfolio           # Create portfolio item
GET    /api/profiles/me/portfolio           # Get my portfolio items
GET    /api/profiles/:profileId/portfolio   # Get user portfolio
GET    /api/profiles/portfolio/:itemId      # Get item details
PUT    /api/profiles/portfolio/:itemId      # Update item
DELETE /api/profiles/portfolio/:itemId      # Delete item
POST   /api/profiles/portfolio/reorder      # Reorder items
GET    /api/profiles/portfolio/search       # Search portfolio
```

### Social Features

#### Following
```
POST   /api/social/:userId/follow          # Follow user
POST   /api/social/:userId/unfollow        # Unfollow user
GET    /api/social/me/followers            # Get my followers
GET    /api/social/me/following            # Get users I follow
GET    /api/social/:userId/followers       # Get user followers
GET    /api/social/:userId/following       # Get users they follow
```

#### Blocking & Muting
```
POST   /api/social/:userId/block           # Block user
POST   /api/social/:userId/unblock         # Unblock user
POST   /api/social/:userId/mute            # Mute user
POST   /api/social/:userId/unmute          # Unmute user
```

#### Network & Discovery
```
GET    /api/social/me/network              # Get my network
GET    /api/social/me/suggested            # Get suggestions
GET    /api/social/:userId/mutual          # Get mutual connections
GET    /api/social/me/stats                # Get social stats
GET    /api/social/:userId/stats           # Get user social stats
```

### Achievements & Badges

#### Badge Management
```
GET    /api/achievements/badges/all        # Get all badges
GET    /api/achievements/badges/:badgeId   # Get badge details
POST   /api/achievements/me/award          # Award badge (admin)
GET    /api/achievements/leaderboard       # Get leaderboard
```

#### Achievement Stats
```
GET    /api/achievements/me/stats          # My achievement stats
GET    /api/achievements/:userId/stats     # User achievement stats
```

### Privacy Controls

#### Settings
```
GET    /api/privacy/me/settings            # Get privacy settings
PUT    /api/privacy/me/settings            # Update settings
```

#### Content Control
```
POST   /api/privacy/me/block/:userId       # Block user
POST   /api/privacy/me/unblock/:userId     # Unblock user
POST   /api/privacy/me/mute/:userId        # Mute user
POST   /api/privacy/me/unmute/:userId      # Unmute user
```

#### Data Management
```
POST   /api/privacy/me/export              # Export data
GET    /api/privacy/me/data                # Get exported data
POST   /api/privacy/me/data/delete         # Delete account
GET    /api/privacy/:userId/can-view       # Check viewability
```

## Data Models

### UserProfile Entity
```typescript
{
  id: UUID;
  userId: UUID;
  bio: string;
  headline: string;
  profilePhotoUrl: string;
  coverPhotoUrl: string;
  location: string;
  website: string;
  socialLinks: Record<string, string>;
  skills: string;
  specialization: string;
  yearsOfExperience: number;
  education: string;
  followersCount: number;
  followingCount: number;
  portfolioItemsCount: number;
  badgesCount: number;
  profileViews: number;
  isVerified: boolean;
  completionStatus: 'incomplete' | 'partial' | 'complete';
  completionPercentage: number;
  theme: { primaryColor?, accentColor?, layout? };
  showBadges: boolean;
  showPortfolio: boolean;
  showActivity: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### PortfolioItem Entity
```typescript
{
  id: UUID;
  profileId: UUID;
  title: string;
  description: string;
  type: 'project' | 'certificate' | 'achievement' | 'publication' | 'course';
  content: string;
  imageUrl: string;
  projectUrl: string;
  repositoryUrl: string;
  certificateUrl: string;
  technologies: string[];
  tags: string[];
  startDate: Date;
  endDate: Date;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  isPublic: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Badge Entity
```typescript
{
  id: UUID;
  name: string;
  description: string;
  iconUrl: string;
  category: 'achievement' | 'learning' | 'participation' | 'skill' | 'milestone';
  rarity: number; // 1-5
  unlockedCriteria: string;
  totalAwarded: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Follow Entity
```typescript
{
  id: UUID;
  followerId: UUID;
  followingId: UUID;
  status: 'follow' | 'block' | 'mute';
  isNotified: boolean;
  createdAt: Date;
}
```

### PrivacySettings Entity
```typescript
{
  id: UUID;
  profileId: UUID;
  profileVisibility: 'public' | 'private' | 'friends-only';
  portfolioVisibility: 'public' | 'private' | 'friends-only';
  badgesVisibility: 'public' | 'private' | 'friends-only';
  activityVisibility: 'public' | 'private' | 'friends-only';
  allowMessaging: boolean;
  allowFollowing: boolean;
  allowMentions: boolean;
  showInSearch: boolean;
  showInRecommendations: boolean;
  shareActivityFeed: boolean;
  shareAnalytics: boolean;
  allowThirdPartyIntegrations: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  blockedUsers: UUID[];
  mutedUsers: UUID[];
  customPrivacy: Record<string, string>;
  dataRetentionDays: number;
  autoDeleteInactivity: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### ProfileAnalytics Entity
```typescript
{
  id: UUID;
  profileId: UUID;
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  totalFollowsGained: number;
  totalFollowsLost: number;
  portfolioItemsViews: number;
  portfolioItemsClicks: number;
  badgesDisplays: number;
  trafficSources: Record<string, number>;
  deviceTypes: Record<string, number>;
  topCountries: Record<string, number>;
  averageSessionDuration: number;
  lastViewedAt: Date;
  recentViewers: Array<{ userId?, timestamp, referrer? }>;
  createdAt: Date;
  updatedAt: Date;
}
```

## Usage Examples

### Create/Update Profile
```bash
curl -X PUT http://localhost:3000/api/profiles/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "bio": "Passionate blockchain educator",
    "headline": "Blockchain Developer & Educator",
    "location": "San Francisco, CA",
    "skills": "Solidity, JavaScript, TypeScript",
    "specialization": "Smart Contracts",
    "yearsOfExperience": 5,
    "website": "https://example.com"
  }'
```

### Create Portfolio Item
```bash
curl -X POST http://localhost:3000/api/profiles/me/portfolio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "DeFi Protocol Implementation",
    "description": "A fully functional DeFi protocol on Stellar",
    "type": "project",
    "projectUrl": "https://github.com/example",
    "technologies": ["Solidity", "JavaScript"],
    "tags": ["blockchain", "defi"],
    "isFeatured": true
  }'
```

### Follow User
```bash
curl -X POST http://localhost:3000/api/social/:userId/follow \
  -H "Authorization: Bearer <token>"
```

### Update Privacy Settings
```bash
curl -X PUT http://localhost:3000/api/privacy/me/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "profileVisibility": "public",
    "portfolioVisibility": "public",
    "allowMessaging": true,
    "emailNotifications": true,
    "marketingEmails": false
  }'
```

## Database Schema

The feature uses 7 new tables:

1. **user_profiles** - Main profile information
2. **portfolio_items** - Portfolio entries
3. **badges** - Badge definitions
4. **user_badges** - User badge assignments
5. **follows** - Follow relationships
6. **privacy_settings** - User privacy preferences
7. **profile_analytics** - Profile view analytics

All tables include proper indexing for performance optimization and foreign key constraints for referential integrity.

## Security Considerations

- **Privacy Enforcement**: All endpoints respect privacy settings
- **Authorization**: Users can only modify their own data
- **Data Validation**: Input validation on all endpoints
- **SQL Injection Prevention**: Parameterized queries via TypeORM
- **Rate Limiting**: Applied to sensitive endpoints
- **Data Export**: GDPR-compliant data export functionality
- **Block/Mute**: Prevent blocked users from viewing profiles

## Performance Optimization

- **Indexed Queries**: Database indexes on frequently queried columns
- **Lazy Loading**: Relations loaded only when needed
- **Pagination**: Support for large result sets
- **Caching**: Analytics data cached appropriately
- **View Tracking**: Efficient view count updates

## Future Enhancements

- Resume builder integration with portfolio export to PDF
- Profile validation badges
- Skill endorsements
- Recommendation system improvements
- Profile recommendations based on skills
- Advanced analytics dashboard
- Profile view notifications
- Social activity feed
- Messaging system integration
