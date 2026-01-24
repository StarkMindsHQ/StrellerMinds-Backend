#!/bin/bash

# Database Backup Script
# Usage: ./scripts/backup.sh [options]

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="backup-${TIMESTAMP}.sql"
COMPRESS="${1:-true}"

# Database configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER:-postgres}"
DB_NAME="${DATABASE_NAME:-strellerminds}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🚀 Starting database backup..."
echo "📁 Backup directory: $BACKUP_DIR"
echo "🗄️  Database: $DB_NAME"

# Perform backup
if [ "$COMPRESS" = "true" ]; then
  echo "📦 Creating compressed backup..."
  PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F p | gzip > "$BACKUP_DIR/${BACKUP_FILE}.gz"
  
  BACKUP_PATH="$BACKUP_DIR/${BACKUP_FILE}.gz"
else
  echo "📦 Creating uncompressed backup..."
  PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F p > "$BACKUP_DIR/$BACKUP_FILE"
  
  BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
fi

# Get file size
FILE_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)

echo "✅ Backup completed successfully!"
echo "📄 File: $BACKUP_PATH"
echo "📊 Size: $FILE_SIZE"

# Create a symlink to the latest backup
ln -sf "$BACKUP_PATH" "$BACKUP_DIR/latest.sql$([ "$COMPRESS" = "true" ] && echo ".gz" || echo "")"

echo "🔗 Latest backup symlink updated"
echo "🎉 Done!"
