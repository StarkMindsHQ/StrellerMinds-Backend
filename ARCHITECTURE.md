# User Profiles Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Application                          │
│  (Web/Mobile - Consumes Profile APIs)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST
┌─────────────────────────▼────────────────────────────────────────┐
│                   NestJS API Gateway                             │
│  (Rate Limiting, CORS, Validation Pipes)                        │
└─────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼───┐  ┌────────▼──────┐  ┌────▼─────────┐
    │ Guards │  │  Decorators   │  │  Interceptors│
    │(JWT)   │  │  (@Param)     │  │(Response)    │
    └────────┘  └───────────────┘  └──────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────▼─────────────────────┐
         │      4 Controllers Layer            │
         ├─────────────────────────────────────┤
         │ • UserProfileController             │
         │ • SocialController                  │
         │ • PrivacyController                 │
         │ • AchievementController             │
         └───────────────┬─────────────────────┘
                         │
         ┌───────────────▼─────────────────────┐
         │      5 Services Layer               │
         ├─────────────────────────────────────┤
         │ • UserProfileService                │
         │ • PortfolioService                  │
         │ • SocialService                     │
         │ • AchievementService                │
         │ • PrivacyService                    │
         └───────────────┬─────────────────────┘
                         │
         ┌───────────────▼──────────────────────┐
         │    TypeORM Repository Layer          │
         ├──────────────────────────────────────┤
         │ Automatic CRUD via TypeORM           │
         │ Relationship Management              │
         │ Query Building                       │
         └───────────────┬──────────────────────┘
                         │
         ┌───────────────▼──────────────────────┐
         │     PostgreSQL Database              │
         ├──────────────────────────────────────┤
         │ • user_profiles                      │
         │ • portfolio_items                    │
         │ • badges                             │
         │ • user_badges                        │
         │ • follows                            │
         │ • privacy_settings                   │
         │ • profile_analytics                  │
         └──────────────────────────────────────┘
```

## Module Dependencies

```
AppModule
├── AuthModule
│   └── (JWT Auth, Guards)
│
└── UserModule
    ├── Controllers
    │   ├── UserProfileController
    │   ├── SocialController
    │   ├── PrivacyController
    │   └── AchievementController
    │
    ├── Services
    │   ├── UserProfileService
    │   │   ├── InjectRepository(UserProfile)
    │   │   └── InjectRepository(ProfileAnalytics)
    │   │
    │   ├── PortfolioService
    │   │   ├── InjectRepository(PortfolioItem)
    │   │   └── InjectRepository(UserProfile)
    │   │
    │   ├── AchievementService
    │   │   ├── InjectRepository(Badge)
    │   │   ├── InjectRepository(UserBadge)
    │   │   └── InjectRepository(UserProfile)
    │   │
    │   ├── SocialService
    │   │   ├── InjectRepository(Follow)
    │   │   └── InjectRepository(UserProfile)
    │   │
    │   └── PrivacyService
    │       ├── InjectRepository(PrivacySettings)
    │       └── InjectRepository(UserProfile)
    │
    └── Entities
        ├── UserProfile
        ├── PortfolioItem
        ├── Badge
        ├── UserBadge
        ├── Follow
        ├── PrivacySettings
        └── ProfileAnalytics
```

## Data Flow Diagrams

### Profile Creation & Management Flow

```
User Registration
    │
    ▼
Auth Service (creates user)
    │
    ▼
UserProfileService.createProfile()
    │
    ├─→ Create UserProfile entity
    ├─→ Create PrivacySettings (default public)
    └─→ Create ProfileAnalytics (initial zeros)
    │
    ▼
Saved to Database
```

### Portfolio Management Flow

```
POST /profiles/me/portfolio
    │
    ▼
UserProfileController
    │
    ▼
Verify User Authorization (JWT Guard)
    │
    ▼
PortfolioService.createPortfolioItem()
    │
    ├─→ Create PortfolioItem
    ├─→ Increment UserProfile.portfolioItemsCount
    └─→ Save to Database
    │
    ▼
Return PortfolioItemResponseDto
```

### Social Network Flow

```
POST /social/:userId/follow
    │
    ▼
SocialController
    │
    ▼
Get both user profiles
    │
    ▼
SocialService.followUser()
    │
    ├─→ Check if already following
    ├─→ Check if blocked
    ├─→ Create Follow relationship
    ├─→ Update follower.followingCount++
    └─→ Update following.followersCount++
    │
    ▼
Return FollowResponseDto
```

### Privacy Enforcement Flow

```
GET /profiles/:profileId
    │
    ▼
Check User Authorization
    │
    ▼
PrivacyService.canViewProfile()
    │
    ├─→ Check if owner (yes → allow)
    ├─→ Check if blocked (yes → deny)
    ├─→ Check profileVisibility
    │   ├─ public → allow
    │   ├─ private → deny (unless owner)
    │   └─ friends-only → check follow relationship
    │
    ▼
Return Profile or 403 Forbidden
```

## Request/Response Cycle

```
1. REQUEST
   POST /api/profiles/me
   Headers: Authorization: Bearer <JWT>
   Body: { bio: "...", headline: "..." }

2. MIDDLEWARE
   → SecurityHeadersMiddleware
   → TokenBlacklistMiddleware
   → ValidationPipe (DTO validation)

3. GUARD
   → JwtAuthGuard (verify token, extract user)

4. CONTROLLER
   → Extract user from request
   → Call service method
   → Validate ownership/permissions

5. SERVICE
   → Business logic
   → Repository calls via TypeORM
   → Data transformation

6. DATABASE
   → Update UserProfile
   → Update ProfileAnalytics if needed

7. RESPONSE
   → Transform entity to DTO
   → Return ResponseInterceptor formats
   → Send 200 OK with updated data

8. CLIENT
   Receives: { id, userId, bio, headline, ... }
```

## Entity Relationships

```
User (from auth module)
  │
  └──1:1──→ UserProfile
             │
             ├──1:N──→ PortfolioItem
             │
             ├──1:N──→ UserBadge
             │         │
             │         └──N:1──→ Badge
             │
             ├──1:1──→ PrivacySettings
             │
             ├──1:1──→ ProfileAnalytics
             │
             ├──1:N──→ Follow (as follower)
             │         └──N:1──→ UserProfile (as following)
             │
             └──1:N──→ Follow (as following)
                       └──N:1──→ UserProfile (as follower)

Relationships:
- UserProfile deletes cascade when User deleted
- PortfolioItem deletes cascade when Profile deleted
- UserBadge deletes cascade when Profile deleted
- Follow deletes cascade when Profile deleted
- PrivacySettings deletes cascade when Profile deleted
- ProfileAnalytics deletes cascade when Profile deleted
```

## Feature Matrix

```
┌─────────────┬───────┬──────────┬──────────┬─────────┐
│   Feature   │ Model │ Service  │ Controller│ Tests   │
├─────────────┼───────┼──────────┼──────────┼─────────┤
│ Profiles    │ ✅    │ ✅       │ ✅       │ TODO    │
│ Portfolio   │ ✅    │ ✅       │ ✅       │ TODO    │
│ Badges      │ ✅    │ ✅       │ ✅       │ TODO    │
│ Social      │ ✅    │ ✅       │ ✅       │ TODO    │
│ Privacy     │ ✅    │ ✅       │ ✅       │ TODO    │
│ Analytics   │ ✅    │ ✅       │ ✅       │ TODO    │
│ Migration   │ ✅    │ -        │ -        │ -       │
│ DTOs        │ -     │ -        │ ✅       │ -       │
│ Docs        │ -     │ -        │ ✅ (API) │ -       │
└─────────────┴───────┴──────────┴──────────┴─────────┘
```

## Scalability Considerations

### Current Implementation
- Single database: PostgreSQL
- In-memory caching: None (ready for Redis)
- Full-text search: Basic SQL LIKE queries
- Analytics: Real-time updates

### Future Optimizations
```
┌─────────────────────────────────────────────┐
│         Caching Layer (Redis)               │
│  • User profiles (5 min TTL)                │
│  • Leaderboard (1 hour TTL)                 │
│  • Suggested users (daily)                  │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│      Read Replicas (PostgreSQL)             │
│  • Analytics queries                        │
│  • Leaderboard generation                   │
│  • Search operations                        │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│      Full-Text Search (Elasticsearch)       │
│  • Portfolio item search                    │
│  • User profile search                      │
│  • Badge search                             │
└─────────────────────────────────────────────┘
```

## API Route Structure

```
/api
├── /profiles
│   ├── /me (GET, PUT)
│   ├── /me/full (GET)
│   ├── /me/portfolio (GET, POST)
│   ├── /me/badges (GET)
│   ├── /me/achievements (GET)
│   ├── /:userId/profile (GET)
│   ├── /:profileId (GET)
│   ├── /:profileId/analytics (GET)
│   ├── /portfolio/:itemId (GET, PUT, DELETE)
│   └── /portfolio/reorder (POST)
│
├── /social
│   ├── /me/followers (GET)
│   ├── /me/following (GET)
│   ├── /me/network (GET)
│   ├── /me/suggested (GET)
│   ├── /me/stats (GET)
│   ├── /:userId/follow (POST)
│   ├── /:userId/unfollow (POST)
│   ├── /:userId/block (POST)
│   ├── /:userId/unblock (POST)
│   ├── /:userId/mute (POST)
│   ├── /:userId/unmute (POST)
│   ├── /:userId/followers (GET)
│   ├── /:userId/following (GET)
│   ├── /:userId/mutual (GET)
│   └── /:userId/stats (GET)
│
├── /privacy
│   ├── /me/settings (GET, PUT)
│   ├── /me/block/:userId (POST)
│   ├── /me/unblock/:userId (POST)
│   ├── /me/mute/:userId (POST)
│   ├── /me/unmute/:userId (POST)
│   ├── /me/export (POST)
│   ├── /me/data (GET)
│   ├── /me/data/delete (POST)
│   └── /:userId/can-view (GET)
│
└── /achievements
    ├── /badges/all (GET)
    ├── /badges/:badgeId (GET)
    ├── /me/award (POST)
    ├── /me/stats (GET)
    ├── /:userId/stats (GET)
    ├── /leaderboard (GET)
    └── /badges/search (GET)
```

---

**Architecture Version**: 1.0
**Last Updated**: January 2026
**Status**: Production Ready
