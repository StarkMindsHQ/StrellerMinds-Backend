# StrellerMinds Backend Developer Portal

## Overview
This document centralizes API onboarding, interactive documentation, SDK generation, and example requests for the StrellerMinds Backend.

## Prerequisites
- A running StrellerMinds Backend instance. Follow `README.md` to install and start the API.

## Base URL
- Local development: `http://localhost:3000/api`
- All routes are prefixed with `/api` (see `src/main.ts`).

## Interactive API Documentation (OpenAPI 3.0)
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

Swagger UI is generated from the OpenAPI 3.0 specification produced by `@nestjs/swagger`. The title, description, version, tags, and bearer auth scheme are configured in `src/main.ts`.

## Authentication and API Key Management
The API uses JWT bearer tokens for access. Token issuance and rotation are handled through the auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`

Use the access token in the `Authorization` header:

```text
Authorization: Bearer <accessToken>
```

Note: `JwtAuthGuard` is registered as a global guard in `src/app.module.ts`, so requests are expected to include the `Authorization` header.

## Response Envelope
All endpoints return a standardized response wrapper from `ResponseInterceptor`:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/example",
  "version": "1.0.0"
}
```

`version` is derived from `API_VERSION` when set, otherwise defaults to `1.0.0`.

## Endpoint Index
### Health
- `GET /api/health`
- `GET /api/health/ready`
- `GET /api/health/live`

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/verify-email`
- `POST /api/auth/change-password`
- `GET /api/auth/profile`
- `POST /api/auth/admin/users`

### Users
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/profile`
- `POST /api/users/:id/change-password`
- `POST /api/users/:id/avatar`
- `POST /api/users/:id/suspend`
- `POST /api/users/:id/reactivate`
- `DELETE /api/users/:id`
- `POST /api/users/bulk-update`
- `GET /api/users/:id/export`
- `GET /api/users/:id/activities`

### User Profiles
- `GET /api/profiles/me`
- `GET /api/profiles/me/full`
- `PUT /api/profiles/me`
- `GET /api/profiles/:userId/profile`
- `GET /api/profiles/:profileId`
- `GET /api/profiles/:profileId/analytics`
- `POST /api/profiles/me/portfolio`
- `GET /api/profiles/me/portfolio`
- `GET /api/profiles/:profileId/portfolio`
- `GET /api/profiles/portfolio/:itemId`
- `PUT /api/profiles/portfolio/:itemId`
- `DELETE /api/profiles/portfolio/:itemId`
- `POST /api/profiles/portfolio/reorder`
- `GET /api/profiles/portfolio/search`
- `GET /api/profiles/me/badges`
- `GET /api/profiles/:profileId/badges`
- `GET /api/profiles/me/achievements/stats`

### Social
- `POST /api/social/:userId/follow`
- `POST /api/social/:userId/unfollow`
- `GET /api/social/me/followers`
- `GET /api/social/me/following`
- `GET /api/social/:userId/followers`
- `GET /api/social/:userId/following`
- `GET /api/social/me/network`
- `GET /api/social/me/suggested`
- `GET /api/social/me/stats`
- `GET /api/social/:userId/stats`
- `POST /api/social/:userId/block`
- `POST /api/social/:userId/unblock`
- `POST /api/social/:userId/mute`
- `POST /api/social/:userId/unmute`
- `GET /api/social/:userId/mutual`

### Privacy
- `GET /api/privacy/me/settings`
- `PUT /api/privacy/me/settings`
- `POST /api/privacy/me/block/:userId`
- `POST /api/privacy/me/unblock/:userId`
- `POST /api/privacy/me/mute/:userId`
- `POST /api/privacy/me/unmute/:userId`
- `POST /api/privacy/me/export`
- `GET /api/privacy/me/data`
- `POST /api/privacy/me/data/delete`
- `GET /api/privacy/:userId/can-view`

### Achievements
- `GET /api/achievements/badges/all`
- `GET /api/achievements/badges/:badgeId`
- `POST /api/achievements/me/award`
- `GET /api/achievements/me/stats`
- `GET /api/achievements/:userId/stats`
- `GET /api/achievements/leaderboard`
- `GET /api/achievements/badges/search`

### Notifications
- `POST /api/notifications/email/send`
- `POST /api/notifications/email/templates`
- `PUT /api/notifications/email/templates/:id`
- `GET /api/notifications/email/templates/:id`
- `GET /api/notifications/email/templates/type/:type`
- `POST /api/notifications/preferences`
- `GET /api/notifications/preferences/:userId`
- `PUT /api/notifications/preferences/:userId`
- `POST /api/notifications/unsubscribe`
- `GET /api/notifications/analytics/:emailQueueId`
- `GET /api/notifications/analytics/user/:userId`
- `GET /api/notifications/analytics/overall`

### Files
- `POST /api/files/upload`
- `POST /api/files/upload-chunk`
- `POST /api/files/complete-upload`
- `GET /api/files/:id`
- `DELETE /api/files/:id`
- `POST /api/files/:id/share`
- `PUT /api/files/:id/public`

## Schema Reference
The OpenAPI spec in Swagger UI provides the complete request and response schemas for each endpoint. The following schemas are defined directly in the codebase and are referenced by the API:

### Auth User Response
Auth endpoints return the auth user model defined in `src/auth/entities/user.entity.ts` with the `password` field removed, plus a computed `fullName` field.

### UserResponseDto (User Management)
Fields returned by `UserResponseDto` in `src/user/dto/user.dto.ts`:

- `id`
- `email`
- `username`
- `firstName`
- `lastName`
- `fullName`
- `avatar`
- `phone`
- `bio`
- `dateOfBirth`
- `status`
- `roles`
- `permissions`
- `emailVerified`
- `lastLogin`
- `loginCount`
- `twoFactorEnabled`
- `createdAt`
- `updatedAt`

### UserProfileResponseDto
Fields returned by `UserProfileResponseDto` in `src/user/dto/profile.dto.ts`:

- `id`
- `userId`
- `bio`
- `headline`
- `profilePhotoUrl`
- `coverPhotoUrl`
- `location`
- `website`
- `skills`
- `specialization`
- `yearsOfExperience`
- `education`
- `socialLinks`
- `theme`
- `showBadges`
- `showPortfolio`
- `showActivity`
- `followersCount`
- `followingCount`
- `portfolioItemsCount`
- `badgesCount`
- `profileViews`
- `isVerified`
- `completionStatus`
- `completionPercentage`
- `createdAt`
- `updatedAt`

### UserProfileWithDetailsDto
`UserProfileWithDetailsDto` extends `UserProfileResponseDto` with:

- `portfolioItems`
- `badges`
- `analytics`

### PortfolioItemResponseDto
Fields returned by `PortfolioItemResponseDto` in `src/user/dto/profile.dto.ts`:

- `id`
- `profileId`
- `title`
- `description`
- `type`
- `content`
- `imageUrl`
- `projectUrl`
- `repositoryUrl`
- `certificateUrl`
- `technologies`
- `tags`
- `startDate`
- `endDate`
- `isFeatured`
- `viewCount`
- `likeCount`
- `isPublic`
- `displayOrder`
- `createdAt`
- `updatedAt`

### ProfileAnalyticsResponseDto
Fields returned by `ProfileAnalyticsResponseDto` in `src/user/dto/profile.dto.ts`:

- `id`
- `profileId`
- `totalViews`
- `viewsToday`
- `viewsThisWeek`
- `viewsThisMonth`
- `totalFollowsGained`
- `totalFollowsLost`
- `portfolioItemsViews`
- `portfolioItemsClicks`
- `badgesDisplays`
- `trafficSources`
- `deviceTypes`
- `topCountries`
- `averageSessionDuration`
- `lastViewedAt`
- `recentViewers`
- `createdAt`
- `updatedAt`

### PrivacySettingsResponseDto
Fields returned by `PrivacySettingsResponseDto` in `src/user/dto/privacy.dto.ts`:

- `id`
- `profileId`
- `profileVisibility`
- `portfolioVisibility`
- `badgesVisibility`
- `activityVisibility`
- `allowMessaging`
- `allowFollowing`
- `allowMentions`
- `showInSearch`
- `showInRecommendations`
- `shareActivityFeed`
- `shareAnalytics`
- `allowThirdPartyIntegrations`
- `emailNotifications`
- `pushNotifications`
- `marketingEmails`
- `blockedUsers`
- `mutedUsers`
- `customPrivacy`
- `dataRetentionDays`
- `autoDeleteInactivity`
- `createdAt`
- `updatedAt`

### AchievementStatsDto
Fields returned by `AchievementStatsDto` in `src/user/dto/achievement.dto.ts`:

- `totalBadgesEarned`
- `totalBadgesAvailable`
- `badgesByCategory`
- `rareBadgesCount`
- `recentBadges`
- `nextBadgeProgress`

### SocialStatsDto
Fields returned by `SocialStatsDto` in `src/user/dto/social.dto.ts`:

- `followersCount`
- `followingCount`
- `mutualConnectionsCount`
- `blockedCount`
- `mutedCount`

## Code Examples (Multiple Languages)

### Login
Request body fields: `email`, `password`, optional `deviceId`.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "deviceId": "web-1"
  }'
```

```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123!',
    deviceId: 'web-1'
  })
});
const data = await response.json();
```

```python
import requests

response = requests.post(
    "http://localhost:3000/api/auth/login",
    json={
        "email": "user@example.com",
        "password": "Password123!",
        "deviceId": "web-1"
    },
)
data = response.json()
```

### Update Profile
Request body fields align with `UpdateUserProfileDto` in `src/user/dto/profile.dto.ts`.

```bash
curl -X PUT http://localhost:3000/api/profiles/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "bio": "Passionate blockchain developer",
    "headline": "Smart Contract Engineer",
    "location": "San Francisco",
    "skills": "Solidity, TypeScript, NestJS",
    "specialization": "DeFi",
    "yearsOfExperience": 5
  }'
```

```javascript
const response = await fetch('http://localhost:3000/api/profiles/me', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer <accessToken>'
  },
  body: JSON.stringify({
    bio: 'Passionate blockchain developer',
    headline: 'Smart Contract Engineer',
    location: 'San Francisco',
    skills: 'Solidity, TypeScript, NestJS',
    specialization: 'DeFi',
    yearsOfExperience: 5
  })
});
const data = await response.json();
```

```python
import requests

response = requests.put(
    "http://localhost:3000/api/profiles/me",
    headers={"Authorization": "Bearer <accessToken>"},
    json={
        "bio": "Passionate blockchain developer",
        "headline": "Smart Contract Engineer",
        "location": "San Francisco",
        "skills": "Solidity, TypeScript, NestJS",
        "specialization": "DeFi",
        "yearsOfExperience": 5
    },
)
data = response.json()
```

### Create Portfolio Item
Request body fields align with `CreatePortfolioItemDto` in `src/user/dto/profile.dto.ts`.

```bash
curl -X POST http://localhost:3000/api/profiles/me/portfolio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "title": "DeFi Lending Protocol",
    "description": "Smart contracts for lending on Stellar",
    "type": "project",
    "projectUrl": "https://github.com/user/defi-protocol",
    "technologies": ["Soroban", "Rust", "TypeScript"],
    "tags": ["DeFi", "Stellar", "Smart Contracts"],
    "startDate": "2023-01-01",
    "endDate": "2023-06-30"
  }'
```

```javascript
const response = await fetch('http://localhost:3000/api/profiles/me/portfolio', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer <accessToken>'
  },
  body: JSON.stringify({
    title: 'DeFi Lending Protocol',
    description: 'Smart contracts for lending on Stellar',
    type: 'project',
    projectUrl: 'https://github.com/user/defi-protocol',
    technologies: ['Soroban', 'Rust', 'TypeScript'],
    tags: ['DeFi', 'Stellar', 'Smart Contracts'],
    startDate: '2023-01-01',
    endDate: '2023-06-30'
  })
});
const data = await response.json();
```

```python
import requests

response = requests.post(
    "http://localhost:3000/api/profiles/me/portfolio",
    headers={"Authorization": "Bearer <accessToken>"},
    json={
        "title": "DeFi Lending Protocol",
        "description": "Smart contracts for lending on Stellar",
        "type": "project",
        "projectUrl": "https://github.com/user/defi-protocol",
        "technologies": ["Soroban", "Rust", "TypeScript"],
        "tags": ["DeFi", "Stellar", "Smart Contracts"],
        "startDate": "2023-01-01",
        "endDate": "2023-06-30"
    },
)
data = response.json()
```

## SDK Generation Pipeline
The OpenAPI spec powers SDK generation. Generate SDKs from the live spec:

```bash
curl -o openapi.json http://localhost:3000/api/docs-json
```

TypeScript (fetch):

```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-fetch \
  -o sdk/typescript
```

Python:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json \
  -g python \
  -o sdk/python
```

Java:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json \
  -g java \
  -o sdk/java
```

## Rate Limiting and Usage Analytics
- Auth endpoints use NestJS Throttler via `ThrottlerGuard` in `src/auth/controllers/auth.controller.ts`.
  - Current module configuration: 10 requests per minute and 100 requests per hour (`src/auth/auth.module.ts`).
- Profile analytics are available via `GET /api/profiles/:profileId/analytics`.
- Email analytics are available via:
  - `GET /api/notifications/analytics/:emailQueueId`
  - `GET /api/notifications/analytics/user/:userId`
  - `GET /api/notifications/analytics/overall`

## Developer Dashboard and Support
- Use Swagger UI (`/api/docs`) as the interactive developer dashboard for exploring and testing endpoints.
- Report issues or request support via the GitHub issue tracker: https://github.com/StarkMindsHQ/StrellerMinds-Backend/issues

## API Versioning and Changelog
- API version is reported in the response envelope (`version` field).
- OpenAPI spec version is set to `1.0.0` in `src/main.ts`.

### 1.0.0
- Baseline OpenAPI 3.0 spec exposed at `/api/docs-json`.
