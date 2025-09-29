# Data Quality Management System

A comprehensive data quality management system for the StrellerMinds platform that ensures data integrity, reliability, and compliance across all data entities.

## Features

### ✅ Data Quality Monitoring
- Real-time quality score tracking
- Automated threshold monitoring
- Performance metrics and trends
- Health status indicators
- Alert system for critical issues

### ✅ Data Validation Rules
- Seven validation types: completeness, accuracy, consistency, validity, uniqueness, timeliness, conformity
- Configurable severity levels (low, medium, high, critical)
- Custom validation conditions
- Auto-fix capabilities

### ✅ Data Cleansing Processes
- Automated data cleaning operations
- Configurable cleansing rules
- Backup of original data
- Batch processing support

### ✅ Data Governance Framework
- Policy management and enforcement
- Data classification system
- Compliance validation
- Audit trail tracking
- Data lineage mapping

### ✅ Data Quality Reporting
- Comprehensive quality reports
- Scheduled report generation
- Email notifications and webhooks
- Historical trend analysis

## Quick Start

### 1. Import the Module

```typescript
import { DataQualityModule } from './data-quality/data-quality.module';

@Module({
  imports: [
    DataQualityModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 2. Use Data Quality Decorators

```typescript
import {
  RequiredField,
  ValidEmail,
  ValidString,
  ValidNumber,
  DataQualityEntity,
  DataQualitySeverity,
} from './data-quality/decorators/data-quality.decorators';

@DataQualityEntity('user')
export class User {
  @RequiredField('Name is required', DataQualitySeverity.HIGH)
  name: string;

  @ValidEmail(DataQualitySeverity.HIGH)
  email: string;

  @ValidString(3, 50, DataQualitySeverity.MEDIUM)
  description: string;

  @ValidNumber(0, 120, DataQualitySeverity.MEDIUM)
  age: number;
}
```

### 3. Perform Data Quality Checks

```typescript
import { DataQualityService } from './data-quality/services/data-quality.service';

@Injectable()
export class UserService {
  constructor(private readonly dataQualityService: DataQualityService) {}

  async validateUsers(users: User[]) {
    const result = await this.dataQualityService.checkDataQuality('user', users);
    
    if (!result.passed) {
      console.log(`Quality issues found: ${result.issues.length}`);
      console.log(`Overall score: ${result.score}%`);
    }
    
    return result;
  }
}
```

### 4. Monitor Data Quality

```typescript
import { DataQualityMonitoringService } from './data-quality/services/data-quality-monitoring.service';

@Injectable()
export class DashboardService {
  constructor(private readonly monitoringService: DataQualityMonitoringService) {}

  async getDashboard() {
    const dashboard = await this.monitoringService.getDashboard();
    
    return {
      overallScore: dashboard.overallScore,
      healthStatus: dashboard.healthStatus,
      activeIssues: dashboard.activeIssues,
      criticalIssues: dashboard.criticalIssues,
    };
  }
}
```

## Configuration

### Environment Variables

```bash
# Monitoring Configuration
DQ_MONITORING_ENABLED=true
DQ_MONITORING_INTERVAL=5
DQ_CRITICAL_THRESHOLD=60
DQ_WARNING_THRESHOLD=80
DQ_RETENTION_DAYS=90

# Validation Configuration
DQ_VALIDATION_ENABLED=true
DQ_STRICT_MODE=false
DQ_BATCH_SIZE=1000
DQ_TIMEOUT_MS=30000

# Cleansing Configuration
DQ_CLEANSING_ENABLED=true
DQ_AUTO_FIX=false
DQ_BACKUP_ORIGINAL=true
DQ_MAX_RETRIES=3

# Governance Configuration
DQ_GOVERNANCE_ENABLED=true
DQ_ENFORCE_COMPLIANCE=false
DQ_AUDIT_TRAIL=true
DQ_DATA_CLASSIFICATION=true

# Reporting Configuration
DQ_REPORTING_ENABLED=true
DQ_SCHEDULE_DAILY=false
DQ_SCHEDULE_WEEKLY=true
DQ_SCHEDULE_MONTHLY=true
DQ_EMAIL_NOTIFICATIONS=false
DQ_WEBHOOK_URL=

# Performance Configuration
DQ_ENABLE_CACHING=true
DQ_CACHE_EXPIRY_MINUTES=15
DQ_MAX_CONCURRENT_CHECKS=10
DQ_ENABLE_PROFILING=false
```

## Available Decorators

### Basic Validation
- `@RequiredField(message?, severity?)` - Ensures field is not empty
- `@OptionalField()` - Marks field as optional
- `@ValidString(minLength?, maxLength?, severity?)` - String validation
- `@ValidNumber(min?, max?, severity?)` - Number validation
- `@ValidDate(severity?)` - Date validation
- `@ValidBoolean(severity?)` - Boolean validation
- `@ValidUUID(severity?)` - UUID validation

### Format Validation
- `@ValidEmail(severity?)` - Email format validation
- `@ValidPhoneNumber(severity?)` - Phone number validation
- `@ValidURL(severity?)` - URL format validation
- `@ValidIPAddress(severity?)` - IP address validation
- `@ValidCreditCard(severity?)` - Credit card validation
- `@ValidPattern(pattern, message?, severity?)` - Custom regex pattern

### Advanced Validation
- `@ValidEnum(enumObject, severity?)` - Enum validation
- `@UniqueField(scope?, severity?)` - Uniqueness validation
- `@TimelyField(maxAgeHours, severity?)` - Timeliness validation
- `@ConsistentWith(relatedField, operator?, severity?)` - Consistency validation

## API Endpoints

### Data Quality Management
- `GET /data-quality/dashboard` - Get quality dashboard
- `GET /data-quality/rules` - List quality rules
- `POST /data-quality/rules` - Create quality rule
- `PUT /data-quality/rules/:id` - Update quality rule
- `DELETE /data-quality/rules/:id` - Delete quality rule
- `POST /data-quality/check` - Perform quality check

### Data Governance
- `GET /data-governance/policies` - List governance policies
- `POST /data-governance/policies` - Create governance policy
- `GET /data-governance/compliance/:entityType` - Check compliance
- `GET /data-governance/lineage/:entity` - Get data lineage

### Data Validation
- `POST /data-validation/validate` - Validate data
- `POST /data-validation/bulk-validate` - Bulk validation

## Event System

The system emits various events that you can listen to:

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class QualityEventHandler {
  @OnEvent('metrics.realtime')
  handleRealTimeMetrics(payload: any) {
    console.log('Real-time metrics:', payload);
  }

  @OnEvent('alert.critical')
  handleCriticalAlert(payload: any) {
    console.log('Critical alert:', payload);
    // Send notification, trigger workflow, etc.
  }

  @OnEvent('alert.acknowledged')
  handleAlertAcknowledged(payload: any) {
    console.log('Alert acknowledged:', payload);
  }
}
```

## Testing

The system includes comprehensive test coverage:

```bash
# Run all data quality tests
npm run test -- --testPathPattern=data-quality

# Run specific test suites
npm run test -- data-quality.service.spec.ts
npm run test -- data-quality-monitoring.service.spec.ts
npm run test -- data-quality.decorators.spec.ts

# Run integration tests
npm run test -- data-quality-flow.spec.ts
```

## Architecture

### Services
- **DataQualityService** - Core quality checking logic
- **DataValidationService** - Validation rule implementations
- **DataCleansingService** - Data cleaning operations
- **DataGovernanceService** - Policy and compliance management
- **DataQualityMonitoringService** - Real-time monitoring and alerting
- **DataQualityReportingService** - Report generation

### Entities
- **DataQualityRule** - Quality validation rules
- **DataQualityMetric** - Quality metrics and scores
- **DataQualityIssue** - Quality issues and violations
- **DataGovernancePolicy** - Governance policies
- **DataLineage** - Data transformation lineage
- **DataQualityReport** - Generated quality reports

### Background Jobs
- Quality check processing
- Data cleansing operations
- Monitoring and alerting
- Report generation

## Best Practices

1. **Start with Basic Rules**: Begin with completeness and validity checks
2. **Set Appropriate Thresholds**: Configure thresholds based on your data requirements
3. **Monitor Regularly**: Use the dashboard to track quality trends
4. **Handle Issues Promptly**: Address critical issues immediately
5. **Use Auto-Fix Carefully**: Test auto-fix rules thoroughly before enabling
6. **Document Policies**: Maintain clear governance policies
7. **Regular Reviews**: Periodically review and update quality rules

## Troubleshooting

### Common Issues

1. **Low Quality Scores**: Check validation rules and data sources
2. **Performance Issues**: Adjust batch sizes and enable caching
3. **Memory Usage**: Monitor concurrent check limits
4. **Alert Fatigue**: Fine-tune alert thresholds

### Debugging

Enable debug logging:
```bash
DEBUG=data-quality:* npm run start:dev
```

Check system health:
```bash
curl http://localhost:3000/data-quality/health
```

## Contributing

1. Follow the existing code patterns
2. Add comprehensive tests for new features
3. Update documentation
4. Ensure all linting passes
5. Test with real data scenarios

## License

This module is part of the StrellerMinds platform and follows the same licensing terms.
