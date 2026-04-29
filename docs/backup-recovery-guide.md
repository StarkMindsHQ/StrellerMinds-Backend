# Backup & Recovery Guide

## Backup

pg_dump $DATABASE_URL > backup.sql

## Restore

psql $DATABASE_URL < backup.sql

## Notes

- Store backups securely
