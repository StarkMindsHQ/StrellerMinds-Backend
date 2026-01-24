# Integration Framework Documentation

## Overview

The StrellerMinds Backend now includes a comprehensive integration framework supporting LTI 1.3, Zoom, Google Classroom, Microsoft Teams, and SSO solutions. This framework enables seamless data synchronization and single sign-on across multiple educational platforms.

## Features

### ✅ LTI 1.3 Integration
- Full LTI 1.3 compliance
- OAuth 2.0 security with JWT tokens
- Assignment Grade Services (AGS) for grade management
- Names and Role Provisioning Services (NRPS) for user/group management
- Course and user mapping
- Grade submission to learning platforms

### ✅ Zoom Integration
- Meeting creation and management
- Recording synchronization
- Participant management
- Webhook support for real-time events
- Meeting lifecycle tracking

### ✅ Google Classroom Integration
- Course synchronization
- Assignment and coursework sync
- Student submission tracking
- Grade management
- OAuth 2.0 authentication

### ✅ Microsoft Teams Integration
- Team and channel management
- Assignment creation and tracking
- Member management
- Submission and grading
- Microsoft Graph API integration

### ✅ Single Sign-On (SSO)
- OpenID Connect support
- SAML 2.0 authentication
- OAuth 2.0 provider support
- LDAP directory integration
- Multi-provider support

### ✅ Data Synchronization
- Bidirectional data sync
- Resource mapping and tracking
- Batch processing with retry logic
- Sync history and logging
- Health monitoring

## Architecture

### Directory Structure

```
src/integrations/
├── common/              # Shared utilities and entities
│   ├── entities/        # Database models
│   ├── dto/             # Data transfer objects
│   ├── utils/           # Helper functions
│   └── constants/       # Constants and configs
├── lti/                 # LTI 1.3 integration
│   ├── controllers/
│   ├── services/
│   └── dto/
├── zoom/                # Zoom integration
├── google/              # Google Classroom integration
├── microsoft/           # Microsoft Teams integration
├── sso/                 # SSO providers
├── sync/                # Synchronization engine
└── integrations.module.ts  # Main module
```

### Database Schema

#### integration_configs
Stores integration configurations for each user.

```sql
- id (UUID, PK)
- userId (UUID, FK)
- integrationType (ENUM: lti, zoom, google, microsoft, sso)
- status (ENUM: active, inactive, suspended, pending)
- credentials (JSONB) - Encrypted credentials
- metadata (JSONB) - Platform-specific metadata
- externalId (TEXT) - External platform ID
- displayName (TEXT) - User-friendly name
- isActive (BOOLEAN)
- lastSyncAt (TIMESTAMP)
- lastSyncStatus (TEXT)
- syncCount (INT)
- expiresAt (TIMESTAMP) - Token expiration
```

#### sync_logs
Records all synchronization activities.

```sql
- id (UUID, PK)
- integrationConfigId (UUID, FK)
- status (ENUM: pending, in_progress, success, failed, partial)
- direction (ENUM: push, pull, bidirectional)
- resourceType (TEXT)
- itemsProcessed (INT)
- itemsFailed (INT)
- errorMessage (TEXT)
- startedAt (TIMESTAMP)
- completedAt (TIMESTAMP)
- durationMs (INT)
- metadata (JSONB)
```

#### integration_mappings
Maps local resources to external platform resources.

```sql
- id (UUID, PK)
- integrationConfigId (UUID, FK)
- localResourceId (TEXT)
- localResourceType (TEXT)
- externalResourceId (TEXT)
- externalResourceType (TEXT)
- externalPlatform (TEXT)
- mappingData (JSONB)
- isActive (BOOLEAN)
- lastSyncAt (TIMESTAMP)
```

## API Endpoints

### LTI Integration
```
POST   /integrations/lti/config                    Create LTI config
GET    /integrations/lti/config/:configId          Get LTI config
PUT    /integrations/lti/config/:configId          Update LTI config
POST   /integrations/lti/config/:configId/activate Activate LTI
POST   /integrations/lti/launch                    Handle LTI launch
POST   /integrations/lti/grades/submit             Submit grade
GET    /integrations/lti/config/:configId/sync-history Get sync history
```

### Zoom Integration
```
POST   /integrations/zoom/config                   Create Zoom config
GET    /integrations/zoom/config/:configId         Get Zoom config
POST   /integrations/zoom/meetings                 Create meeting
GET    /integrations/zoom/meetings/:meetingId      Get meeting details
PUT    /integrations/zoom/meetings/:meetingId      Update meeting
DELETE /integrations/zoom/meetings/:meetingId      Delete meeting
GET    /integrations/zoom/recordings               Get recordings
POST   /integrations/zoom/sync-recordings          Sync recordings
POST   /integrations/zoom/webhook                  Webhook endpoint
```

### Google Classroom Integration
```
POST   /integrations/google/config                 Create Google config
GET    /integrations/google/config/:configId       Get Google config
GET    /integrations/google/auth/url               Get OAuth URL
GET    /integrations/google/auth/callback          OAuth callback
GET    /integrations/google/courses                Get courses
POST   /integrations/google/sync-courses           Sync courses
POST   /integrations/google/sync-assignments       Sync assignments
```

### Microsoft Teams Integration
```
POST   /integrations/microsoft/config              Create Microsoft config
GET    /integrations/microsoft/config/:configId    Get Microsoft config
GET    /integrations/microsoft/auth/url            Get OAuth URL
GET    /integrations/microsoft/auth/callback       OAuth callback
GET    /integrations/microsoft/teams               Get teams
POST   /integrations/microsoft/assignments         Create assignment
POST   /integrations/microsoft/sync-teams          Sync teams
```

### SSO Integration
```
POST   /integrations/sso/config                    Create SSO config
GET    /integrations/sso/config/:configId          Get SSO config
GET    /integrations/sso/configs                   List SSO configs
PUT    /integrations/sso/config/:configId          Update SSO config
POST   /integrations/sso/config/:configId/activate Activate SSO
GET    /integrations/sso/openid/auth/:configId     OpenID auth endpoint
GET    /integrations/sso/openid/callback           OpenID callback
POST   /integrations/sso/saml/acs                  SAML ACS endpoint
GET    /integrations/sso/oauth2/auth/:configId     OAuth2 auth endpoint
GET    /integrations/sso/oauth2/callback           OAuth2 callback
```

### Sync Management
```
GET    /integrations/sync/history/:configId        Get sync history
GET    /integrations/sync/log/:logId                Get sync log
GET    /integrations/sync/mappings/:configId       Get mappings
GET    /integrations/sync/mappings/:configId/:id   Get mapping detail
GET    /integrations/sync/health/:configId         Check sync health
POST   /integrations/sync/trigger/:configId        Trigger manual sync
GET    /integrations/sync/stats/:configId          Get sync statistics
```

## Configuration

### Environment Variables

```env
# LTI Configuration
LTI_PLATFORM_URL=https://your-lti-platform.com
LTI_CLIENT_ID=your_client_id
LTI_CLIENT_SECRET=your_client_secret

# Zoom Configuration
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
ZOOM_WEBHOOK_SECRET=your_webhook_secret

# Google Configuration
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Microsoft Configuration
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id

# JWT and Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# API Configuration
API_URL=https://api.strellerminds.com
APP_NAME=StrellerMinds
```

## Usage Examples

### Creating an LTI Integration

```typescript
const ltiConfig = await ltiConfigService.createLtiConfig(
  userId,
  'https://canvas.instructure.com',
  'client_id',
  'client_secret',
  'key_id',
  'public_key'
);

// Activate integration
await ltiConfigService.activateLtiConfig(ltiConfig.id, userId);
```

### Creating a Zoom Integration

```typescript
const zoomConfig = await zoomConfigService.createZoomConfig(
  userId,
  'account_id',
  'client_id',
  'client_secret',
  'webhook_secret',
  'webhook_url'
);

// Create a meeting
const meeting = await zoomService.createMeeting(
  accessToken,
  userId,
  'Biology 101 - Lecture',
  '2024-02-01T10:00:00Z',
  60
);
```

### Syncing Google Classroom Data

```typescript
const syncLog = await googleConfigService.syncCourses(configId, userId);

// Check sync status
const history = await googleConfigService.getSyncHistory(configId);
```

### Setting Up OpenID Connect SSO

```typescript
const ssoConfig = await ssoConfigService.createSSOConfig(
  userId,
  'openid',
  'University SSO',
  {
    clientId: 'client_id',
    clientSecret: 'client_secret',
    discoveryUrl: 'https://auth.university.edu/.well-known/openid-configuration'
  }
);

// Activate SSO
await ssoConfigService.activateSSOConfig(ssoConfig.id, userId);
```

## Security Considerations

1. **Credential Encryption**: All credentials are encrypted using AES-256-GCM
2. **Token Management**: Access tokens are stored with expiration tracking
3. **Webhook Verification**: All incoming webhooks are cryptographically verified
4. **Rate Limiting**: API calls are rate-limited to prevent abuse
5. **Audit Logging**: All integration activities are logged for compliance

## Error Handling

All integration endpoints follow consistent error handling:

```json
{
  "success": false,
  "error": {
    "code": "INTEGRATION_NOT_FOUND",
    "message": "Integration configuration not found",
    "details": {}
  }
}
```

## Testing

Run integration tests:

```bash
npm run test integrations
```

Run e2e tests:

```bash
npm run test:e2e
```

## Monitoring and Troubleshooting

### Check Sync Health

```typescript
const health = await syncEngineService.checkSyncHealth(configId);
console.log(health);
// {
//   status: 'active',
//   recentSyncs: { total: 5, successful: 5, failed: 0, successRate: 100 },
//   statistics: { totalItemsProcessed: 250, averageDurationMs: 2345 }
// }
```

### View Sync Logs

```typescript
const logs = await syncEngineService.getSyncLogs(configId, 20, 0);
```

### Troubleshoot Failed Syncs

- Check `sync_logs` table for error messages
- Verify credentials in `integration_configs`
- Ensure external API endpoints are accessible
- Check webhook signature verification

## Performance Optimization

- Syncs are batched in groups of 100 (configurable)
- Retry logic uses exponential backoff (5s, 10s, 20s)
- Mappings are indexed for fast lookups
- Sync logs are cleaned up based on retention policy

## Future Enhancements

- [ ] Webhook-triggered syncs
- [ ] Real-time bidirectional sync
- [ ] Data transformation pipelines
- [ ] Custom field mappings UI
- [ ] Bulk import/export functionality
- [ ] Integration templates and wizards
