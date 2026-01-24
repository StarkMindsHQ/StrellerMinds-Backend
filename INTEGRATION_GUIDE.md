# User Profiles Integration Guide

## Quick Start

This guide covers how to integrate and use the new User Profiles feature in your StrellerMinds Backend application.

## Prerequisites

- Node.js v18+
- PostgreSQL v12+
- Existing StrellerMinds Backend with authentication setup

## Installation & Setup

### 1. Ensure Dependencies are Installed
```bash
npm install
```

### 2. Run Database Migration
```bash
npm run migration:run
```

Or if migrations aren't set to auto-run:
```bash
npm run typeorm migration:run
```

### 3. Start the Application
```bash
npm run start:dev
```

## Creating Initial Profiles

When a new user registers, you'll need to create their profile. Update the auth service:

```typescript
// In auth.service.ts after user creation
async register(registerDto: RegisterDto): Promise<UserResponse> {
  // ... existing code ...
  
  // Create user profile
  await this.userProfileService.createProfile(user.id);
  
  // ... rest of code ...
}
```

## Using the Services

### Profile Service
```typescript
import { UserProfileService } from './services/user-profile.service';

constructor(private userProfileService: UserProfileService) {}

// Get user profile
const profile = await this.userProfileService.getProfileByUserId(userId);

// Update profile
const updated = await this.userProfileService.updateProfile(userId, updateDto);

// Get profile with all details
const fullProfile = await this.userProfileService.getProfileWithDetails(userId);

// Track profile view
await this.userProfileService.trackProfileView(profileId, referrer);
```

### Portfolio Service
```typescript
import { PortfolioService } from './services/portfolio.service';

constructor(private portfolioService: PortfolioService) {}

// Create portfolio item
const item = await this.portfolioService.createPortfolioItem(profileId, createDto);

// Get items
const items = await this.portfolioService.getPortfolioItems(profileId);

// Get featured items
const featured = await this.portfolioService.getFeaturedItems(profileId);

// Track views
await this.portfolioService.trackPortfolioView(itemId);
```

### Social Service
```typescript
import { SocialService } from './services/social.service';

constructor(private socialService: SocialService) {}

// Follow user
await this.socialService.followUser(followerProfileId, followingProfileId);

// Get followers
const followers = await this.socialService.getFollowers(profileId);

// Get network
const network = await this.socialService.getUserNetwork(profileId);

// Check if following
const isFollowing = await this.socialService.isFollowing(followerId, followingId);

// Block user
await this.socialService.blockUser(blockerProfileId, blockedProfileId);
```

### Achievement Service
```typescript
import { AchievementService } from './services/achievement.service';

constructor(private achievementService: AchievementService) {}

// Award badge
await this.achievementService.awardBadgeToUser(profileId, {
  badgeId: '...',
  unlockedReason: 'Completed blockchain course'
});

// Get badges
const badges = await this.achievementService.getUserBadges(profileId);

// Get leaderboard
const leaderboard = await this.achievementService.getLeaderboard(10);

// Get stats
const stats = await this.achievementService.getAchievementStats(profileId);
```

### Privacy Service
```typescript
import { PrivacyService } from './services/privacy.service';

constructor(private privacyService: PrivacyService) {}

// Get settings
const settings = await this.privacyService.getPrivacySettings(userId);

// Update settings
const updated = await this.privacyService.updatePrivacySettings(userId, updateDto);

// Block/mute
await this.privacyService.blockUser(userId, blockedUserId);

// Check if blocked
const isBlocked = await this.privacyService.isUserBlocked(userId, blockerId);

// Export data
const data = await this.privacyService.exportUserData(userId);
```

## API Examples

### Create Profile Item
```bash
curl -X PUT http://localhost:3000/api/profiles/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "bio": "Passionate blockchain developer",
    "headline": "Smart Contract Engineer",
    "location": "San Francisco",
    "skills": "Solidity, TypeScript, NestJS",
    "specialization": "DeFi",
    "yearsOfExperience": 5
  }'
```

### Add Portfolio Item
```bash
curl -X POST http://localhost:3000/api/profiles/me/portfolio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
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

### Follow a User
```bash
curl -X POST http://localhost:3000/api/social/:userId/follow \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Update Privacy Settings
```bash
curl -X PUT http://localhost:3000/api/privacy/me/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "profileVisibility": "public",
    "portfolioVisibility": "friends-only",
    "allowMessaging": true,
    "emailNotifications": false
  }'
```

## Frontend Integration

### Display User Profile
```typescript
// Get full profile with details
const response = await fetch('/api/profiles/me/full', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const profile = await response.json();

// Access data
console.log(profile.bio);
console.log(profile.portfolioItems);
console.log(profile.badges);
console.log(profile.analytics);
```

### Update Profile
```typescript
const response = await fetch('/api/profiles/me', {
  method: 'PUT',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    bio: 'Updated bio',
    headline: 'New headline'
  })
});
```

### Follow User
```typescript
const response = await fetch(`/api/social/${userId}/follow`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Get Network
```typescript
const response = await fetch('/api/social/me/network', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const network = await response.json();

console.log(network.followers);
console.log(network.following);
console.log(network.suggestedUsers);
```

## Database Queries

### Get user with profile
```sql
SELECT u.*, p.* FROM users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.id = '<user_id>';
```

### Get user portfolio items
```sql
SELECT pi.* FROM portfolio_items pi
JOIN user_profiles p ON pi.profile_id = p.id
WHERE p.user_id = '<user_id>'
ORDER BY pi.display_order ASC;
```

### Get followers
```sql
SELECT p.* FROM user_profiles p
JOIN follows f ON p.id = f.follower_id
WHERE f.following_id = '<profile_id>' AND f.status = 'follow';
```

### Get user badges
```sql
SELECT b.*, ub.* FROM badges b
JOIN user_badges ub ON b.id = ub.badge_id
WHERE ub.profile_id = '<profile_id>'
ORDER BY ub.awarded_at DESC;
```

## Maintenance Tasks

### Reset Daily Analytics
```bash
# Create a scheduled job to reset daily views
npm run task:reset-daily-analytics
```

### Update Profile Completion %
```typescript
// This is done automatically on profile update
// But you can manually trigger:
const profile = await userProfileService.getProfileByUserId(userId);
await userProfileService.updateProfile(userId, profile);
```

### Clean Up Old Analytics
```typescript
// Archive analytics older than 1 year
// Can be implemented as a scheduled job
```

## Testing

### Test Profile Creation
```bash
curl -X PUT http://localhost:3000/api/profiles/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(curl -s http://localhost:3000/api/auth/login -d '{"email":"test@example.com","password":"password"}' | jq -r '.accessToken')" \
  -d '{
    "bio": "Test bio",
    "headline": "Test headline"
  }'
```

### Test Portfolio
```bash
# Create portfolio item
curl -X POST http://localhost:3000/api/profiles/me/portfolio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title": "Test Project", "type": "project"}'

# Get portfolio
curl http://localhost:3000/api/profiles/me/portfolio \
  -H "Authorization: Bearer <TOKEN>"
```

### Test Social
```bash
# Follow user
curl -X POST http://localhost:3000/api/social/<USER_ID>/follow \
  -H "Authorization: Bearer <TOKEN>"

# Get followers
curl http://localhost:3000/api/social/me/followers \
  -H "Authorization: Bearer <TOKEN>"
```

## Troubleshooting

### Migration Fails
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify `typeorm` is properly installed

### Profile Not Created
- Check user was properly created first
- Verify user ID exists in database
- Check migration ran successfully

### Can't Follow Users
- Ensure both users have profiles
- Check privacy settings allow following
- Verify users aren't blocked

### Analytics Not Tracking
- Ensure profile view endpoint is called
- Check ProfileAnalytics table was created
- Verify analytics service is injected

## Performance Optimization

### Database Indices
All critical columns are indexed:
- `user_profiles.user_id`
- `portfolio_items.profile_id`
- `user_badges.profile_id`
- `follows.follower_id`, `following_id`
- `privacy_settings.profile_id`

### Query Optimization
- Use `relations` in queries only when needed
- Implement pagination for large result sets
- Cache leaderboard data

### Caching Strategy
```typescript
// Cache profile for 5 minutes
@Cacheable({
  ttl: 5 * 60 * 1000
})
getProfileByUserId(userId: string) {
  // ...
}
```

## Security Checklist

- ✅ All endpoints require JWT authentication
- ✅ Users can only access their own data
- ✅ Privacy settings are enforced
- ✅ Block/mute functionality prevents access
- ✅ Input validation via DTOs
- ✅ GDPR data export available
- ✅ Rate limiting on sensitive endpoints
- ✅ SQL injection prevention via TypeORM

## Production Deployment

1. Set `synchronize: false` in TypeORM config
2. Use proper database backups
3. Enable read replicas for analytics queries
4. Implement caching layer (Redis)
5. Monitor query performance
6. Set up alerting for data anomalies
7. Regular data exports for compliance
8. Test disaster recovery procedures

---

For more detailed documentation, see [USER_PROFILES.md](USER_PROFILES.md)
