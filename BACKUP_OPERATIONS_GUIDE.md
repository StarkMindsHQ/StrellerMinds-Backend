# Backup and Recovery Operations Guide

## Quick Reference

### Emergency Contacts
- **DR Coordinator**: [Name/Contact]
- **Database Admin**: [Name/Contact]
- **Cloud Provider Support**: [AWS/GCP/Azure Support]
- **Security Team**: [Name/Contact]

## Immediate Actions

### Database Failure
```bash
# 1. Assess the situation
curl http://localhost:3000/backup/status

# 2. Identify latest good backup
curl http://localhost:3000/backup/list?limit=5

# 3. Initiate emergency restore
curl -X POST http://localhost:3000/backup/restore \
  -H "Content-Type: application/json" \
  -d '{"backupId": "BACKUP_ID", "targetDatabase": "strellerminds"}'

# 4. Monitor restore progress
watch -n 5 'curl http://localhost:3000/backup/restore/status'
```

### Data Corruption
```bash
# 1. Stop writes to prevent further corruption
# 2. Identify corruption point from logs
tail -f logs/database.log | grep -i error

# 3. Find clean backup before corruption
curl http://localhost:3000/backup/list?type=full&before=CORRUPTION_TIME

# 4. Perform point-in-time restore
curl -X POST http://localhost:3000/backup/restore/point-in-time \
  -H "Content-Type: application/json" \
  -d '{"targetTime": "TIMESTAMP", "targetDatabase": "strellerminds_clean"}'
```

### Complete Site Failure
```bash
# 1. Activate DR site
./scripts/activate-dr-site.sh

# 2. Restore from cross-region backup
aws s3 cp s3://strellerminds-backups-replica/latest.sql.gz ./backups/
gunzip < ./backups/latest.sql.gz | psql -h DR_DB_HOST -U postgres -d strellerminds

# 3. Update DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch file://dns-failover.json

# 4. Verify services
./scripts/verify-dr-activation.sh
```

## Daily Operations Checklist

### Morning Checks (9:00 AM)
- [ ] Verify overnight backups completed successfully
  ```bash
  curl http://localhost:3000/backup/stats?date=yesterday
  ```
- [ ] Check backup storage utilization
  ```bash
  df -h backups/
  ```
- [ ] Review backup logs for errors
  ```bash
  tail -n 100 logs/backup.log | grep -i error
  ```
- [ ] Verify replication status
  ```bash
  curl http://localhost:3000/backup/replication/status
  ```

### Evening Checks (6:00 PM)
- [ ] Confirm daily backup scheduled correctly
- [ ] Check disk space trends
- [ ] Review any failed verification checks
- [ ] Update backup registry if needed

## Weekly Operations

### Monday
- [ ] Run weekly disaster recovery test
  ```bash
  curl -X POST http://localhost:3000/backup/dr-test/run
  ```
- [ ] Review DR test results
  ```bash
  curl http://localhost:3000/backup/dr-test/report/latest
  ```
- [ ] Clean up old test databases
  ```bash
  psql -c "DROP DATABASE IF EXISTS dr_test_*"
  ```

### Wednesday
- [ ] Verify backup integrity spot-check
  ```bash
  ./scripts/verify-random-backup.sh
  ```
- [ ] Test restore procedure in staging
  ```bash
  ./scripts/test-restore-staging.sh
  ```

### Friday
- [ ] Generate weekly backup report
  ```bash
  ./scripts/generate-weekly-report.sh > reports/backup-weekly.md
  ```
- [ ] Review storage costs
- [ ] Plan capacity needs

## Monthly Operations

### First Week
- [ ] Conduct full disaster recovery drill
- [ ] Review and update DR documentation
- [ ] Test all recovery scenarios
- [ ] Update contact lists
- [ ] Review RPO/RTO compliance

### Second Week
- [ ] Audit backup access controls
- [ ] Review encryption key rotation schedule
- [ ] Test backup restoration to different region
- [ ] Validate compliance requirements

### Third Week
- [ ] Performance testing of backup systems
- [ ] Optimize backup schedules if needed
- [ ] Review and update retention policies
- [ ] Archive old backup logs

### Fourth Week
- [ ] Monthly management reporting
- [ ] Budget review for storage costs
- [ ] Vendor relationship review (AWS/GCP/Azure)
- [ ] Plan improvements for next month

## Backup Procedures

### Manual Full Backup
```bash
# With compression and encryption
./scripts/backup.sh full --compress --encrypt

# Upload to S3 immediately
./scripts/backup.sh full --upload-s3

# Custom retention
./scripts/backup.sh full --retention-tier monthly
```

### Manual Incremental Backup
```bash
# Create incremental backup
./scripts/backup.sh incremental

# Verify after creation
./scripts/verify-backup.sh latest
```

### File Storage Backup
```bash
# Sync files to replica region
aws s3 sync s3://strellerminds-files s3://strellerminds-files-replica

# Verify file integrity
./scripts/verify-file-storage.sh

# Generate file inventory
./scripts/generate-file-inventory.sh > reports/files-inventory.csv
```

## Recovery Procedures

### Single Table Recovery
```bash
# Extract single table from backup
pg_restore -d strellerminds -t table_name backup_file.dump

# Or using psql for SQL dumps
psql -d strellerminds -c "\copy table_name FROM stdin" < backup_file.sql
```

### Schema Recovery Only
```bash
# Restore schema without data
pg_restore -d strellerminds -s backup_file.dump

# Or extract schema from SQL dump
grep -A 1000 "CREATE TABLE" backup_file.sql | psql -d strellerminds
```

### Point-in-Time Recovery
```bash
# 1. Identify target timestamp
TARGET_TIME="2026-03-26 15:30:00"

# 2. Find appropriate backup
curl "http://localhost:3000/backup/list?before=$TARGET_TIME"

# 3. Restore to that point
./scripts/restore-pitr.sh "$TARGET_TIME"
```

## Monitoring Commands

### Real-time Backup Status
```bash
# Watch current backup progress
watch -n 2 'curl http://localhost:3000/backup/current'

# Monitor backup logs
tail -f logs/backup.log | jq 'select(.level == "ERROR")'
```

### Storage Metrics
```bash
# Local storage usage
du -sh backups/*

# S3 storage usage
aws s3api get-bucket-metrics \
  --bucket strellerminds-backups \
  --metric-name BucketSizeBytes

# Cost estimation
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "last month" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Simple Storage Service"]}}'
```

### Performance Metrics
```bash
# Average backup duration
curl http://localhost:3000/backup/metrics/average-duration

# Success rate trend
curl http://localhost:3000/backup/metrics/success-rate?days=30

# RPO compliance
curl http://localhost:3000/backup/metrics/rpo-compliance

# RTO compliance
curl http://localhost:3000/backup/metrics/rto-compliance
```

## Troubleshooting Guide

### Backup Taking Too Long
```bash
# 1. Check database load
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 2. Check network bandwidth
speedtest-cli

# 3. Check disk I/O
iostat -x 5

# 4. Consider increasing compression threads
export BACKUP_COMPRESSION_LEVEL=fast
```

### Restore Failing
```bash
# 1. Verify backup file integrity
sha256sum backup_file.sql.gz
./scripts/verify-backup.sh backup_file.sql.gz

# 2. Check target database connectivity
psql -h target_host -U postgres -d strellerminds -c "SELECT 1"

# 3. Check available disk space
df -h /var/lib/postgresql

# 4. Review PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Replication Lag
```bash
# 1. Check replication status
aws s3api list-object-versions --bucket strellerminds-backups

# 2. Force replication sync
./scripts/force-replication-sync.sh

# 3. Check network connectivity between regions
ping -c 10 s3.us-west-2.amazonaws.com
```

## Security Procedures

### Key Rotation
```bash
# Rotate encryption keys quarterly
./scripts/rotate-encryption-keys.sh

# Re-encrypt existing backups with new key
./scripts/reencrypt-backups.sh --key-version v2
```

### Access Audit
```bash
# Generate access log report
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetObject \
  --start-time $(date -d "30 days ago" +%Y-%m-%d) \
  --end-time $(date +%Y-%m-%d)

# Review unauthorized access attempts
grep "Access Denied" logs/backup.log
```

### Compliance Reporting
```bash
# Generate compliance report
./scripts/generate-compliance-report.sh --period last-month

# Export audit trail
./scripts/export-audit-trail.sh --format csv
```

## Performance Optimization

### Speed Up Backups
```bash
# Use parallel dumps
export PG_DUMP_PARALLEL=4

# Reduce compression level for speed
export BACKUP_COMPRESSION_LEVEL=1

# Use incremental backups more frequently
# Configure in backup scheduler
```

### Reduce Storage Costs
```bash
# Move old backups to Glacier
aws s3 lifecycle put \
  --bucket strellerminds-backups \
  --lifecycle-configuration file://glacier-transition.json

# Delete expired backups
./scripts/cleanup-expired-backups.sh

# Enable S3 Intelligent-Tiering
aws s3api put-bucket-lifecycle-configuration \
  --bucket strellerminds-backups \
  --lifecycle-configuration file://intelligent-tiering.json
```

## Testing Procedures

### Monthly DR Test Script
```bash
#!/bin/bash
# monthly-dr-test.sh

echo "Starting monthly DR test..."

# 1. Select random backup from last week
BACKUP_ID=$(curl http://localhost:3000/backup/list?days=7 | jq -r '.[0].id')

# 2. Create test environment
echo "Creating test environment..."
psql -c "CREATE DATABASE dr_test_$(date +%s)"

# 3. Restore backup
echo "Restoring backup $BACKUP_ID..."
curl -X POST http://localhost:3000/backup/restore \
  -H "Content-Type: application/json" \
  -d "{\"backupId\": \"$BACKUP_ID\", \"targetDatabase\": \"dr_test_$(date +%s)\"}"

# 4. Verify restoration
echo "Verifying restoration..."
./scripts/verify-restoration.sh

# 5. Cleanup
echo "Cleaning up..."
psql -c "DROP DATABASE dr_test_$(date +%s)"

echo "DR test completed!"
```

## Communication Templates

### Incident Notification
```
Subject: [INCIDENT] Database Recovery Initiated

Team,

We have initiated database recovery procedures due to [REASON].

Current Status:
- Issue detected at: TIMESTAMP
- Recovery started at: TIMESTAMP
- Estimated completion: TIMESTAMP
- Impact: [DESCRIPTION]

Next update in: 30 minutes

Recovery Team
```

### Recovery Completion
```
Subject: [RESOLVED] Database Recovery Completed

Team,

Database recovery has been completed successfully.

Summary:
- Downtime duration: X hours Y minutes
- Data loss: None / X minutes
- Root cause: [DESCRIPTION]
- Preventive actions: [LIST]

Full report to follow within 24 hours.

Recovery Team
```

## Appendix

### Useful Scripts Location
- `/scripts/backup.sh` - Main backup script
- `/scripts/restore.sh` - Restore script
- `/scripts/verify-backup.sh` - Verification
- `/scripts/cleanup-expired-backups.sh` - Cleanup
- `/scripts/generate-report.sh` - Reporting

### Configuration Files
- `src/database/backup/backup.module.ts` - Module config
- `.env.backup` - Environment variables
- `scripts/backup.config.sh` - Backup settings

### Important Documentation
- Disaster Recovery Plan: `docs/DISASTER_RECOVERY_PLAN.md`
- Backup Policy: `docs/BACKUP_POLICY.md`
- Security Guidelines: `docs/BACKUP_SECURITY.md`
