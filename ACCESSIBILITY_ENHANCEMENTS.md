# Accessibility and Internationalization Enhancements

## Overview

Enhanced the existing accessibility system with database persistence, monitoring, analytics, and improved RTL support.

## New Features Added

### 1. Accessibility Audit Persistence
- **Database Entities**: Created `AccessibilityAudit` and `AccessibilityViolation` entities
- **Audit History**: Track all accessibility audits with full details
- **Violation Tracking**: Store individual violations linked to audits

**Files:**
- `src/accessibility/entities/accessibility-audit.entity.ts`
- `src/accessibility/entities/accessibility-violation.entity.ts`

### 2. Accessibility Monitoring Service
- **Save Audits**: Persist audit results to database
- **Audit History**: Retrieve audit history with filtering
- **Statistics**: Get comprehensive accessibility statistics
- **Trends**: Track accessibility scores over time

**Features:**
- Calculate accessibility scores (0-100)
- Track WCAG 2.1 AA compliance rate
- Monitor issues by severity (critical, serious, moderate, minor)
- Generate trends and analytics

**Files:**
- `src/accessibility/services/accessibility-monitoring.service.ts`

### 3. Enhanced API Endpoints

#### New Endpoints:
- `GET /api/accessibility/audits` - Get audit history (requires auth)
- `GET /api/accessibility/audits/:id` - Get specific audit details (requires auth)
- `GET /api/accessibility/statistics` - Get accessibility statistics (requires auth)
- `POST /api/accessibility/audit` - Enhanced audit endpoint that saves results

**Files:**
- `src/accessibility/controllers/accessibility.controller.ts` (enhanced)
- `src/accessibility/dto/audit.dto.ts`

### 4. Database Migration
- Created migration for accessibility audit tables
- Includes proper indexes for performance
- Foreign key relationships to users

**Files:**
- `src/migrations/1710100000000-CreateAccessibilityAuditTables.ts`

## Existing Features (Already Implemented)

### ✅ WCAG 2.1 AA Compliance
- Comprehensive WCAG checklist
- ARIA attribute builder
- Color contrast validation
- Skip navigation links

### ✅ Screen Reader Optimization
- ARIA landmarks support
- Screen reader text generation
- Dynamic content announcements
- Semantic HTML validation

### ✅ Keyboard Navigation
- Keyboard event handlers
- Focus trap management
- Tab order validation
- Keyboard shortcuts support

### ✅ Multi-Language Support
- 15+ languages supported
- Language detection middleware
- Translation service with interpolation
- Language metadata

### ✅ RTL Language Support
- RTL language detection (Arabic, Hebrew, Persian, Urdu)
- Directional CSS classes
- Spacing and positioning utilities
- Number, date, and currency formatting
- Logical CSS properties transformation

### ✅ Accessibility Testing
- Comprehensive audit framework
- WCAG compliance validation
- Keyboard navigation testing
- Screen reader compatibility checks
- Form accessibility validation
- Image accessibility checks
- Heading structure validation

## Usage Examples

### Run Accessibility Audit and Save Results

```typescript
POST /api/accessibility/audit
{
  "url": "https://example.com/page",
  "html": "<html>...</html>",
  "type": "full_audit",
  "notes": "Initial accessibility audit"
}

Response:
{
  "auditId": "uuid",
  "summary": {
    "total": 5,
    "critical": 1,
    "serious": 2,
    "moderate": 1,
    "minor": 1,
    "pass": false
  },
  "wcagCompliance": {
    "level": "AA",
    "meets": false
  },
  ...
}
```

### Get Audit History

```typescript
GET /api/accessibility/audits?startDate=2024-01-01&endDate=2024-01-31&limit=50

Response:
[
  {
    "id": "uuid",
    "url": "https://example.com/page",
    "status": "failed",
    "accessibilityScore": 75,
    "wcag21AACompliant": false,
    "totalIssues": 5,
    "createdAt": "2024-01-15T10:00:00Z",
    ...
  }
]
```

### Get Statistics

```typescript
GET /api/accessibility/statistics?days=30

Response:
{
  "totalAudits": 150,
  "passedAudits": 120,
  "failedAudits": 20,
  "warningAudits": 10,
  "averageScore": 85.5,
  "wcagComplianceRate": 80,
  "issuesBySeverity": {
    "critical": 5,
    "serious": 15,
    "moderate": 30,
    "minor": 50
  },
  "trends": [
    {
      "date": "2024-01-01",
      "score": 82,
      "issues": 8
    },
    ...
  ]
}
```

## Database Schema

### accessibility_audits
- `id` (uuid, primary key)
- `userId` (uuid, foreign key to users)
- `url` (varchar)
- `type` (enum: wcag_compliance, keyboard_navigation, screen_reader, etc.)
- `status` (enum: passed, failed, warning)
- `totalIssues`, `criticalIssues`, `seriousIssues`, `moderateIssues`, `minorIssues` (int)
- `accessibilityScore` (float)
- `wcag21AACompliant` (boolean)
- `auditResults` (jsonb)
- `recommendations` (jsonb)
- `notes` (text)
- `createdAt`, `updatedAt` (timestamp)

### accessibility_violations
- `id` (uuid, primary key)
- `auditId` (uuid, foreign key to accessibility_audits)
- `type` (varchar)
- `severity` (enum: critical, serious, moderate, minor)
- `description` (text)
- `wcagCriteria` (varchar)
- `recommendation` (text)
- `element`, `selector` (varchar)
- `metadata` (jsonb)
- `createdAt` (timestamp)

## Integration

The enhanced accessibility module is fully integrated:
- ✅ TypeORM entities registered
- ✅ Services exported and available
- ✅ Controller endpoints with Swagger documentation
- ✅ Authentication guards on protected endpoints
- ✅ Database migration ready

## Next Steps

1. **Run Migration**: `npm run migration:run`
2. **Test Endpoints**: Use Swagger UI at `/api/docs`
3. **Monitor Audits**: Track accessibility over time
4. **Generate Reports**: Use statistics endpoint for dashboards

## Benefits

- **Historical Tracking**: All audits are saved for trend analysis
- **User-Specific Audits**: Track audits per user
- **Analytics**: Comprehensive statistics and trends
- **Compliance Monitoring**: Track WCAG 2.1 AA compliance rate
- **Issue Prioritization**: Severity-based issue tracking
