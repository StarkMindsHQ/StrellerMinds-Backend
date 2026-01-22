#!/bin/bash

# Database Restore Script
# Usage: ./scripts/restore.sh <backup-file>

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "❌ Error: No backup file specified"
  echo "Usage: ./scripts/restore.sh <backup-file>"
  echo ""
  echo "Available backups:"
  ls -lh backups/ | grep backup-
  exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Database configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER:-postgres}"
DB_NAME="${DATABASE_NAME:-strellerminds}"

echo "⚠️  WARNING: This will restore the database and overwrite existing data!"
echo "🗄️  Database: $DB_NAME"
echo "📄 Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 0
fi

echo "🚀 Starting database restore..."

# Restore based on file extension
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "📦 Decompressing and restoring..."
  gunzip < "$BACKUP_FILE" | PGPASSWORD="$DATABASE_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME"
else
  echo "📦 Restoring..."
  PGPASSWORD="$DATABASE_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" < "$BACKUP_FILE"
fi

echo "✅ Restore completed successfully!"
echo "🎉 Done!"
