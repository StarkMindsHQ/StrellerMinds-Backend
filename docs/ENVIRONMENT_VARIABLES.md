# Environment Variables

This guide documents the environment variables used by the StrellerMinds backend. Copy `.env.example` to `.env` for local development, then replace placeholder values with environment-specific secrets.

Never commit real credentials. In production, load secrets from a managed secret store such as AWS Secrets Manager, Azure Key Vault, HashiCorp Vault, or your platform's encrypted environment variable system.

## Minimum Required Configuration

These variables are required for the API to boot and perform core authentication/database work.

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | Recommended | `development` | Runtime environment. Use `production` in production to disable TypeORM synchronization and enable stricter security behavior. |
| `PORT` | No | `3000` | HTTP port. Defaults to `3000`. |
| `DATABASE_HOST` | Yes | `localhost` | PostgreSQL host. |
| `DATABASE_PORT` | Yes | `5432` | PostgreSQL port. |
| `DATABASE_USER` | Yes | `strellerminds_app` | PostgreSQL username. |
| `DATABASE_PASSWORD` | Yes | `replace-with-secure-password` | PostgreSQL password. |
| `DATABASE_NAME` | Yes | `strellerminds` | PostgreSQL database name. |
| `DB_ENCRYPTION_KEY` | Yes | `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f` | 64-character hex string used for AES-256-GCM database field encryption. Must decode to 32 bytes. |
| `DB_ENCRYPTION_SALT` | Yes | `replace-with-random-salt` | Salt used to build blind indexes for encrypted lookup fields. |
| `JWT_SECRET` | Yes | `replace-with-32-plus-character-secret` | Secret used for access, email verification, and password reset JWTs. |
| `JWT_REFRESH_SECRET` | Yes | `replace-with-different-32-plus-character-secret` | Secret used for refresh JWTs. Use a different value from `JWT_SECRET`. |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime. |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime. |
| `JWT_EMAIL_EXPIRES_IN` | No | `24h` | Email verification token lifetime. |
| `JWT_PASSWORD_RESET_EXPIRES_IN` | No | `1h` | Password reset token lifetime. |

## Application and HTTP

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | Recommended | `production` | Controls production-only HTTPS/HSTS behavior and database synchronization defaults. |
| `PORT` | No | `3000` | Port passed to `app.listen`. |
| `CORS_ORIGINS` | Production | `https://app.strellerminds.com,https://admin.strellerminds.com` | Comma-separated list of allowed browser origins. Defaults to `http://localhost:3000`. |
| `MAX_REQUEST_SIZE` | No | `10mb` | Express JSON and URL-encoded body size limit. |
| `FRONTEND_URL` | Recommended | `https://app.strellerminds.com` | Base URL used in auth email links. Defaults to `http://localhost:3000`. |
| `COOKIE_DOMAIN` | Production | `.strellerminds.com` | Domain assigned to auth cookies. Leave unset for localhost. |
| `CERT_PIN_SHA256` | Optional | `base64-encoded-spki-pin` | Expected certificate pin used by certificate pinning middleware when configured. |
| `REQUEST_SIGNING_SECRET` | Production | `replace-with-signing-secret` | HMAC secret for request signing. The code has a development fallback, but production should always set this. |
| `ADMIN_IP_WHITELIST` | Optional | `127.0.0.1,10.0.0.10` | Comma-separated IP allowlist for admin-only security checks. |

## Database and Connection Pooling

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `DATABASE_HOST` | Yes | `localhost` | PostgreSQL host. |
| `DATABASE_PORT` | Yes | `5432` | PostgreSQL port. |
| `DATABASE_USER` | Yes | `strellerminds_app` | PostgreSQL user. |
| `DATABASE_PASSWORD` | Yes | `replace-with-secure-password` | PostgreSQL password. |
| `DATABASE_NAME` | Yes | `strellerminds` | PostgreSQL database. |
| `DATABASE_POOL_MAX` | No | `20` | Maximum PostgreSQL pool size. Defaults vary by environment. |
| `DATABASE_POOL_MIN` | No | `5` | Minimum PostgreSQL pool size. Defaults vary by environment. |
| `DATABASE_IDLE_TIMEOUT` | No | `30000` | Milliseconds before an idle connection is closed. |
| `DATABASE_CONNECTION_TIMEOUT` | No | `10000` | Milliseconds to wait for a new connection. |
| `DATABASE_ACQUIRE_TIMEOUT` | No | `60000` | Milliseconds to wait while acquiring a pooled connection. |
| `DATABASE_CREATE_TIMEOUT` | No | `30000` | Milliseconds to wait while creating a pooled connection. |
| `DATABASE_DESTROY_TIMEOUT` | No | `5000` | Milliseconds to wait while destroying a pooled connection. |
| `DATABASE_REAP_INTERVAL` | No | `1000` | Milliseconds between idle connection reap checks. |
| `DATABASE_CREATE_RETRY_INTERVAL` | No | `200` | Milliseconds between pool connection creation retries. |
| `DATABASE_CONNECTION_MAX_USES` | Optional | `10000` | Maximum uses per connection when advanced pooling config is enabled. |
| `DATABASE_VALIDATE_CONNECTIONS` | Optional | `true` | Enables connection validation in advanced pooling config. |
| `DATABASE_RUN_ON_CONNECT` | Optional | `true` | Runs connection setup when advanced pooling config is enabled. |
| `DATABASE_STATEMENT_TIMEOUT` | Optional | `30000` | PostgreSQL statement timeout in milliseconds. |
| `DATABASE_QUERY_TIMEOUT` | Optional | `30000` | Query timeout in milliseconds. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Production | `true` | Enables SSL certificate validation for PostgreSQL. |
| `DATABASE_SSL_CERT` | Optional | `/etc/ssl/db/client-cert.pem` | PostgreSQL SSL client certificate path. |
| `DATABASE_SSL_KEY` | Optional | `/etc/ssl/db/client-key.pem` | PostgreSQL SSL client key path. |
| `DATABASE_SSL_CA` | Optional | `/etc/ssl/db/ca.pem` | PostgreSQL SSL CA certificate path. |
| `DATABASE_POOL_LOG` | No | `false` | Enables connection pool logging. Keep disabled in production unless troubleshooting. |
| `DATABASE_APP_NAME` | No | `strellerminds-backend` | Application name for database monitoring. |
| `DATABASE_RETRY_ATTEMPTS` | Optional | `5` | Retry attempt count for database workflows that support retries. |
| `DATABASE_RETRY_DELAY` | Optional | `3000` | Delay between database retries in milliseconds. |

## Redis, Queues, and Cache

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `REDIS_HOST` | Required when queues/Redis health checks are enabled | `localhost` | Redis host. Defaults to `localhost` in queue and Redis clients. |
| `REDIS_PORT` | No | `6379` | Redis port. |
| `REDIS_PASSWORD` | Production | `replace-with-redis-password` | Redis password. |
| `REDIS_DB` | No | `0` | Redis database index. |
| `CACHE_TTL_MS` | No | `60000` | In-memory cache TTL in milliseconds. |
| `CACHE_MAX_ITEMS` | No | `500` | Maximum in-memory cache item count. |

## Email

The mail module reads `MAIL_*` variables. Some health-check and example files also reference `SMTP_*`; keep both sets aligned if both are used in your deployment.

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `MAIL_HOST` | Required for sending email | `smtp.gmail.com` | SMTP host used by the Nest mailer module. |
| `MAIL_PORT` | No | `587` | SMTP port used by the Nest mailer module. |
| `MAIL_SECURE` | No | `false` | Whether SMTP uses TLS from connection start. |
| `MAIL_USER` | Required for authenticated SMTP | `noreply@strellerminds.com` | SMTP username. |
| `MAIL_PASSWORD` | Required for authenticated SMTP | `replace-with-app-password` | SMTP password or app password. |
| `MAIL_FROM` | No | `"StrellerMinds" <noreply@strellerminds.com>` | Default From header. |
| `SMTP_HOST` | Optional | `smtp.gmail.com` | SMTP host used by external service health checks and legacy examples. |
| `SMTP_PORT` | Optional | `587` | SMTP port used by health checks and legacy examples. |
| `SMTP_SECURE` | Optional | `false` | Legacy/example SMTP secure flag. |
| `SMTP_USER` | Optional | `noreply@strellerminds.com` | Legacy/example SMTP username. |
| `SMTP_PASS` | Optional | `replace-with-app-password` | Legacy/example SMTP password. |
| `SMTP_FROM` | Optional | `noreply@strellerminds.com` | Legacy/example From address. |

## Authentication and Security

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `JWT_SECRET` | Yes | `replace-with-32-plus-character-secret` | Access, email verification, and password reset JWT secret. |
| `JWT_REFRESH_SECRET` | Yes | `replace-with-different-32-plus-character-secret` | Refresh token JWT secret. |
| `JWT_EXPIRES_IN` | No | `15m` | Access token expiry. |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiry. |
| `JWT_EMAIL_EXPIRES_IN` | No | `24h` | Email verification token expiry. |
| `JWT_PASSWORD_RESET_EXPIRES_IN` | No | `1h` | Password reset token expiry. |
| `RATE_LIMIT_TTL` | No | `60000` | Rate limiting window in milliseconds. |
| `RATE_LIMIT_MAX` | No | `10` | Max requests per rate limit window. |
| `DB_ENCRYPTION_KEY` | Yes | `64-hex-character-key` | AES-256-GCM key for encrypted database fields. |
| `DB_ENCRYPTION_SALT` | Yes | `replace-with-random-salt` | Salt for blind indexes on encrypted fields. |
| `SECURE_LOGGING_ENABLED` | No | `true` | Enables secure log redaction. |
| `SECURE_LOGGING_REPLACEMENT_VALUE` | No | `[REDACTED]` | Replacement text for redacted values. |
| `SECURE_LOGGING_SENSITIVE_FIELDS` | No | `password,token,authorization` | Comma-separated field names to redact from logs. |

## Stellar and Blockchain

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `SOROBAN_RPC_URL` | Required for Stellar integrations | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint. Also used by external service health checks. |
| `STELLAR_NETWORK` | Required for Stellar integrations | `TESTNET` | Stellar network identifier. |
| `CREDENTIAL_CONTRACT_ID` | Required for credential contract operations | `CCONTRACTIDEXAMPLE` | Deployed Soroban credential contract ID. |
| `SIGNER_SECRET_KEY` | Required for signing Stellar transactions | `SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Stellar secret key. Never commit real keys. |

## File Uploads, CDN, and Media

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `UPLOAD_DIR` | No | `./uploads` | Local upload directory. |
| `CDN_BASE_URL` | Optional | `https://cdn.strellerminds.com` | Base URL returned by the CDN service. |
| `CLOUDINARY_CLOUD_NAME` | Optional | `strellerminds` | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Optional | `replace-with-api-key` | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Optional | `replace-with-api-secret` | Cloudinary API secret. |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | Required for CloudFront video delivery | `E1234567890ABC` | CloudFront distribution ID. |
| `AWS_CLOUDFRONT_DOMAIN` | Required for CloudFront video delivery | `d1234567890abc.cloudfront.net` | CloudFront distribution domain. |
| `AWS_S3_BUCKET` | Required for S3 video storage | `strellerminds-videos` | S3 bucket for video assets. |
| `AWS_S3_REGION` | Required for S3 video storage | `us-east-1` | S3 bucket region. |
| `AWS_ACCESS_KEY_ID` | Required for AWS API access | `AKIA...` | AWS access key ID. |
| `AWS_SECRET_ACCESS_KEY` | Required for AWS API access | `replace-with-secret-access-key` | AWS secret access key. |
| `AWS_CLOUDFRONT_PRIVATE_KEY_ID` | Required for signed CloudFront URLs | `K1234567890ABC` | CloudFront public key ID. |
| `AWS_CLOUDFRONT_PRIVATE_KEY` | Required for signed CloudFront URLs | `-----BEGIN PRIVATE KEY-----...` | CloudFront private key content. Store as an escaped single-line value if your platform requires it. |
| `AWS_SIGNED_URL_EXPIRY` | No | `3600` | Signed URL lifetime in seconds. |

## Video Processing

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `VIDEO_PROCESSING_ENABLED` | No | `true` | Enables video processing workflows. |
| `VIDEO_PROCESSING_CONCURRENT_JOBS` | No | `2` | Max concurrent video processing jobs. |
| `VIDEO_PROCESSING_TEMP_DIR` | No | `./temp/video-processing` | Temporary working directory for video processing. |
| `FFMPEG_PATH` | Required when processing video | `/usr/bin/ffmpeg` | Path to `ffmpeg`. |
| `FFPROBE_PATH` | Required when processing video | `/usr/bin/ffprobe` | Path to `ffprobe`. |
| `VIDEO_TOKEN_EXPIRY` | No | `3600` | Video access token expiry in seconds. |
| `VIDEO_DRM_ENABLED` | No | `false` | Enables DRM integrations. |
| `DRM_WIDEVINE_LICENSE_URL` | Required when Widevine DRM is enabled | `https://drm.example.com/widevine/license` | Widevine license endpoint. |
| `DRM_WIDEVINE_CERT_URL` | Required when Widevine DRM is enabled | `https://drm.example.com/widevine/cert` | Widevine certificate endpoint. |
| `DRM_FAIRPLAY_LICENSE_URL` | Required when FairPlay DRM is enabled | `https://drm.example.com/fairplay/license` | FairPlay license endpoint. |
| `DRM_FAIRPLAY_CERT_URL` | Required when FairPlay DRM is enabled | `https://drm.example.com/fairplay/cert` | FairPlay certificate endpoint. |
| `VIDEO_ANALYTICS_ENABLED` | No | `true` | Enables video analytics collection. |
| `VIDEO_ANALYTICS_BATCH_SIZE` | No | `100` | Analytics batch size. |
| `VIDEO_ANALYTICS_RETENTION_DAYS` | No | `365` | Analytics retention period. |
| `VIDEO_DEFAULT_QUALITIES` | No | `240p,360p,480p,720p,1080p` | Comma-separated output qualities. |
| `VIDEO_ADAPTIVE_STREAMING_ENABLED` | No | `true` | Enables adaptive streaming. |
| `VIDEO_HLS_ENABLED` | No | `true` | Enables HLS output. |
| `VIDEO_DASH_ENABLED` | No | `true` | Enables DASH output. |
| `VIDEO_THUMBNAIL_COUNT` | No | `5` | Number of thumbnails to generate. |
| `VIDEO_PREVIEW_ENABLED` | No | `true` | Enables preview generation. |
| `VIDEO_MAX_FILE_SIZE` | No | `5368709120` | Max video upload size in bytes. |
| `VIDEO_ALLOWED_FORMATS` | No | `mp4,webm,mov,avi,mkv` | Allowed video file extensions. |
| `VIDEO_MAX_DURATION` | No | `7200` | Max video duration in seconds. |
| `VIDEO_MIN_DURATION` | No | `1` | Min video duration in seconds. |

## Backups and Recovery

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `BACKUP_DIR` | No | `./backups` | Local backup directory. |
| `BACKUP_RETENTION_DAYS` | No | `30` | General backup retention in days. |
| `BACKUP_DAILY_RETENTION_DAYS` | No | `30` | Daily backup retention in days. |
| `BACKUP_WEEKLY_RETENTION_WEEKS` | No | `12` | Weekly backup retention in weeks. |
| `BACKUP_MONTHLY_RETENTION_MONTHS` | No | `12` | Monthly backup retention in months. |
| `BACKUP_YEARLY_RETENTION_YEARS` | No | `7` | Yearly backup retention in years. |
| `BACKUP_VERIFICATION_ENABLED` | No | `true` | Enables backup verification. |
| `BACKUP_ENCRYPTION_ENABLED` | No | `true` | Enables backup encryption. |
| `BACKUP_ENCRYPTION_KEY` | Required when backup encryption is enabled | `base64-encoded-32-byte-key` | Backup encryption key. |
| `BACKUP_CLOUD_UPLOAD_ENABLED` | No | `true` | Enables cloud backup upload. |
| `AWS_BACKUP_BUCKET` | Required when cloud backup upload is enabled | `strellerminds-backups` | Primary backup S3 bucket. |
| `AWS_BACKUP_REPLICA_BUCKET` | Optional | `strellerminds-backups-replica` | Replica backup S3 bucket. |
| `AWS_BACKUP_REPLICA_REGION` | Optional | `us-west-2` | Replica backup S3 region. |
| `BACKUP_CROSS_REGION_REPLICATION` | No | `true` | Enables cross-region backup replication. |
| `BACKUP_SCHEDULING_ENABLED` | No | `true` | Enables scheduled backups. |
| `BACKUP_RECOVERY_TEST_ENABLED` | No | `true` | Enables scheduled recovery testing. |
| `BACKUP_RECOVERY_TEST_DATABASE` | Optional | `strellerminds_recovery_test` | Database used for recovery test restores. |
| `BACKUP_ALERT_ON_SUCCESS` | No | `false` | Sends alert on successful backup. |
| `BACKUP_ALERT_ON_FAILURE` | No | `true` | Sends alert on failed backup. |
| `BACKUP_ALERT_ON_RECOVERY_TEST` | No | `true` | Sends alert on recovery test result. |
| `BACKUP_STORAGE_WARNING_THRESHOLD_GB` | No | `500` | Storage warning threshold in GB. |

## Logging, Monitoring, and Alerts

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `LOG_LEVEL` | No | `info` | Log level. |
| `LOG_FORMAT` | No | `json` | Log output format. |
| `LOG_FILE_ENABLED` | No | `true` | Enables application file logging. |
| `LOG_FILE_PATH` | No | `logs/app-%DATE%.log` | Application log file path pattern. |
| `LOG_FILE_MAX_SIZE` | No | `20m` | Max application log file size. |
| `LOG_FILE_MAX_FILES` | No | `14` | Max retained application log files. |
| `LOG_CONSOLE_ENABLED` | No | `true` | Enables console logging. |
| `LOG_CONSOLE_COLORIZE` | No | `true` | Enables colored console logs. |
| `LOG_ERROR_FILE_ENABLED` | No | `true` | Enables separate error file logging. |
| `LOG_ERROR_FILE_PATH` | No | `logs/error-%DATE%.log` | Error log file path pattern. |
| `LOG_ERROR_FILE_MAX_SIZE` | No | `20m` | Max error log file size. |
| `LOG_ERROR_FILE_MAX_FILES` | No | `30` | Max retained error log files. |
| `SENTRY_ENABLED` | No | `false` | Enables Sentry integration. |
| `SENTRY_DSN` | Required when Sentry is enabled | `https://example@sentry.io/123` | Sentry DSN. |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0.1` | Sentry trace sample rate. |
| `SENTRY_DEBUG` | No | `false` | Enables Sentry debug logging. |
| `SENTRY_HTTP_INTEGRATION` | No | `true` | Enables Sentry HTTP integration. |
| `SENTRY_EXPRESS_INTEGRATION` | No | `true` | Enables Sentry Express integration. |
| `SENTRY_CONSOLE_INTEGRATION` | No | `true` | Enables Sentry console integration. |
| `ALERTING_ENABLED` | No | `false` | Master switch for alerting. |
| `EMAIL_ALERTS_ENABLED` | No | `false` | Enables email alerts. |
| `EMAIL_ALERT_RECIPIENTS` | Required when email alerts are enabled | `admin@example.com,dev@example.com` | Comma-separated alert recipients. |
| `SLACK_ALERTS_ENABLED` | No | `false` | Enables Slack alerts. |
| `SLACK_WEBHOOK_URL` | Required when Slack alerts are enabled | `https://hooks.slack.com/services/...` | Slack webhook URL. |
| `SLACK_ALERT_CHANNEL` | Optional | `#alerts` | Slack alert channel. |
| `WEBHOOK_ALERTS_ENABLED` | No | `false` | Enables generic webhook alerts. |
| `WEBHOOK_ALERT_URL` | Required when webhook alerts are enabled | `https://hooks.example.com/alerts` | Alert webhook URL. |
| `WEBHOOK_ALERT_HEADERS` | Optional | `{"Authorization":"Bearer token"}` | JSON object of headers sent with alert webhooks. |
| `ERROR_RATE_THRESHOLD` | No | `0.05` | Error-rate alert threshold. |
| `RESPONSE_TIME_THRESHOLD` | No | `5000` | Response-time alert threshold in milliseconds. |
| `CRITICAL_ERROR_CODES` | No | `INTERNAL_ERROR,DATABASE_ERROR,EXTERNAL_SERVICE_ERROR` | Comma-separated error codes treated as critical. |
| `ALERT_RATE_LIMITING_ENABLED` | No | `true` | Enables alert rate limiting. |
| `MAX_ALERTS_PER_HOUR` | No | `10` | Max alerts per hour. |
| `ALERT_COOLDOWN_MINUTES` | No | `5` | Cooldown between repeated alerts. |

## OpenTelemetry and Elasticsearch

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `OTEL_SERVICE_NAME` | Optional | `streller-minds-backend` | OpenTelemetry service name. |
| `OTEL_COLLECTOR_URL` | Optional | `http://localhost:4318/v1/traces` | OTLP or collector trace endpoint. |
| `OTEL_EXPORTER` | Optional | `otlp` | Trace exporter. Common values: `otlp`, `jaeger`, `zipkin`. |
| `OTEL_SAMPLER_PROBABILITY` | Optional | `1.0` | Trace sampling probability from `0` to `1`. |
| `OTEL_RESOURCE_ATTRIBUTES` | Optional | `service.version=1.0` | Comma-separated OpenTelemetry resource attributes. |
| `ELASTICSEARCH_NODE` | Optional | `http://localhost:9200` | Elasticsearch node URL. |
| `ELASTICSEARCH_USERNAME` | Optional | `elastic` | Elasticsearch username. |
| `ELASTICSEARCH_PASSWORD` | Optional | `replace-with-password` | Elasticsearch password. |

## Contract and OpenAPI Validation

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `OPENAPI_VALIDATION_ENABLED` | No | `true` | Enables OpenAPI validation middleware. |
| `OPENAPI_VALIDATION_STRICT` | No | `false` | Enables strict validation in the OpenAPI validation service. |
| `OPENAPI_STRICT_MODE` | No | `false` | Enables strict behavior in the middleware compatibility path. |
| `OPENAPI_VALIDATE_RESPONSES` | No | `true` | Validates outgoing responses. |
| `OPENAPI_VALIDATE_REQUESTS` | No | `true` | Validates incoming requests. |
| `OPENAPI_LOG_VIOLATIONS` | No | `true` | Logs contract violations. |
| `OPENAPI_REPORT_VIOLATIONS` | No | `true` | Reports contract violations. |
| `OPENAPI_SPEC_PATH` | No | `./api-specification.yaml` | OpenAPI specification path. |
| `OPENAPI_CACHE_VALIDATION` | No | `true` | Enables validation result caching. |
| `OPENAPI_MAX_CACHE_SIZE` | No | `1000` | Max validation cache entries. |
| `CONTRACT_VIOLATION_REPORTING_ENABLED` | No | `true` | Enables contract violation reporting. |
| `CONTRACT_CRITICAL_VIOLATION_THRESHOLD` | No | `5` | Critical violation alert threshold. |
| `CONTRACT_HIGH_VIOLATION_THRESHOLD` | No | `10` | High violation alert threshold. |
| `CONTRACT_TOTAL_VIOLATION_THRESHOLD` | No | `50` | Total violation alert threshold. |
| `CONTRACT_VIOLATION_RATE_THRESHOLD` | No | `10` | Violations per 1000 requests threshold. |
| `CONTRACT_ALERT_EMAIL_ENABLED` | No | `true` | Enables contract email alerts. |
| `CONTRACT_ALERT_EMAIL_RECIPIENTS` | Optional | `api-team@example.com` | Contract alert email recipients. |
| `CONTRACT_ALERT_SLACK_ENABLED` | No | `false` | Enables contract Slack alerts. |
| `CONTRACT_ALERT_SLACK_CHANNELS` | Optional | `#api-alerts` | Contract Slack alert channels. |
| `CONTRACT_ALERT_WEBHOOK_ENABLED` | No | `false` | Enables contract webhook alerts. |
| `CONTRACT_ALERT_WEBHOOK_URLS` | Optional | `https://hooks.example.com/contracts` | Contract alert webhook URLs. |
| `CONTRACT_ALERT_DASHBOARD_ENABLED` | No | `true` | Enables dashboard alert reporting. |
| `CONTRACT_ALERT_COOLDOWN` | No | `300` | Contract alert cooldown in seconds. |

## Webhooks

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `STRIPE_WEBHOOK_SECRET` | Required for Stripe webhooks | `whsec_replace_with_secret` | Stripe webhook signing secret. |
| `PAYPAL_WEBHOOK_SECRET` | Required for PayPal webhooks | `replace-with-paypal-secret` | PayPal webhook signing secret. |
| `ZOOM_WEBHOOK_SECRET` | Required for Zoom webhooks | `replace-with-zoom-secret` | Zoom webhook signing secret. |
| `CUSTOM_WEBHOOK_SECRET` | Required for custom webhooks | `replace-with-custom-secret` | Custom webhook signing secret. |
| `WEBHOOK_RATE_LIMIT_STRIPE` | No | `100` | Stripe webhook rate limit per minute. |
| `WEBHOOK_RATE_LIMIT_PAYPAL` | No | `50` | PayPal webhook rate limit per minute. |
| `WEBHOOK_RATE_LIMIT_ZOOM` | No | `200` | Zoom webhook rate limit per minute. |
| `WEBHOOK_RATE_LIMIT_CUSTOM` | No | `100` | Custom webhook rate limit per minute. |
| `WEBHOOK_REPLAY_WINDOW` | No | `300000` | Replay protection window in milliseconds. |
| `WEBHOOK_LOG_RETENTION_DAYS` | No | `30` | Webhook log retention in days. |
| `WEBHOOK_LOG_INCLUDE_PAYLOAD` | No | `false` | Whether webhook logs include request payloads. Keep disabled for sensitive payloads. |
| `WEBHOOK_LOG_INCLUDE_HEADERS` | No | `true` | Whether webhook logs include request headers. |

## Testing and Developer Tooling

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `VISUAL_TEST_BASE_URL` | No | `http://localhost:3000` | Base URL used by visual regression tests. |
| `VISUAL_TEST_THRESHOLD` | No | `0.01` | Visual diff threshold. |

## Production Checklist

- Set `NODE_ENV=production`.
- Use different, high-entropy values for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Generate a unique 64-character hex `DB_ENCRYPTION_KEY`; do not reuse the example key.
- Set `DB_ENCRYPTION_SALT` before creating encrypted user records. Changing it later can break blind-index lookups.
- Configure `CORS_ORIGINS`, `COOKIE_DOMAIN`, and HTTPS/TLS at the platform or proxy layer.
- Set `REQUEST_SIGNING_SECRET`; do not rely on development fallbacks.
- Store Stellar signer keys, AWS keys, webhook secrets, database credentials, and encryption keys in a secrets manager.
- Keep `WEBHOOK_LOG_INCLUDE_PAYLOAD=false` unless there is a reviewed operational need.
