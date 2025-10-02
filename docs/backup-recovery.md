# Backup and Recovery Process

## Database Recovery

### Full Database Restore

```bash
# Stop the application
npm run stop

# Drop existing database (CAUTION!)
dropdb -h localhost -p 5432 -U postgres streller_minds

# Create new database
createdb -h localhost -p 5432 -U postgres streller_minds

# Restore from backup
psql -h localhost -p 5432 -U postgres -d streller_minds -f ./backups/db-backup-YYYY-MM-DDTHH-MM-SS.sql

# Start the application
npm run start:prod
```

## Point-in-Time Recovery (PITR) for PostgreSQL

### Enabling WAL Archiving

1. Edit your postgresql.conf:
   - Set `wal_level = replica`
   - Set `archive_mode = on`
   - Set `archive_command = 'cp %p /path/to/wal_archive/%f'`
2. Restart PostgreSQL.

### Performing PITR

1. Stop the application and PostgreSQL server.
2. Restore the base backup (latest .sql file).
3. Copy required WAL files to the pg_wal directory.
4. Create a recovery.signal file in the data directory.
5. Edit recovery parameters (recovery_target_time) in postgresql.conf if needed.
6. Start PostgreSQL. It will replay WAL up to the target time.

## Disaster Recovery Plan

### Purpose

Restore platform operations in the event of catastrophic data loss or system failure.

### Roles & Responsibilities

- **Backup Admin:** Monitors backups, receives alerts, and initiates recovery.
- **DevOps:** Assists with server/database restoration.
- **Support:** Communicates with stakeholders.

### Steps

1. Assess the incident and determine recovery point.
2. Notify stakeholders.
3. Stop all application services.
4. Restore database and application data from latest verified backup.
5. (If needed) Use PITR to restore to a specific point.
6. Validate data integrity and application functionality.
7. Resume services and monitor.

### Contacts

- Backup Admin: [admin@example.com]
- DevOps: [devops@example.com]

## Recovery Testing Procedures

- Schedule quarterly recovery drills.
- Randomly select a backup and perform a test restore to a staging environment.
- Document the process, duration, and any issues.
- Update procedures based on findings.
