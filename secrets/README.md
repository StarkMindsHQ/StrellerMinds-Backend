# Secrets Management

This directory contains environment-specific secrets files. These files should **NEVER** be committed to version control.

## Usage

Create a secrets file for your environment:

### Development
```bash
# secrets/development.secrets
DATABASE_PASSWORD=your_dev_password
REDIS_PASSWORD=your_dev_redis_password
JWT_SECRET=your_dev_jwt_secret
CLOUDINARY_API_SECRET=your_cloudinary_secret
SIGNER_SECRET_KEY=your_signer_key
```

### Staging
```bash
# secrets/staging.secrets
DATABASE_PASSWORD=your_staging_password
REDIS_PASSWORD=your_staging_redis_password
JWT_SECRET=your_staging_jwt_secret
CLOUDINARY_API_SECRET=your_cloudinary_secret
SIGNER_SECRET_KEY=your_signer_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_CLOUDFRONT_PRIVATE_KEY=your_cloudfront_key
```

### Production
```bash
# secrets/production.secrets
DATABASE_PASSWORD=your_production_password
REDIS_PASSWORD=your_production_redis_password
JWT_SECRET=your_production_jwt_secret
CLOUDINARY_API_SECRET=your_cloudinary_secret
SIGNER_SECRET_KEY=your_signer_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_CLOUDFRONT_PRIVATE_KEY=your_cloudfront_key
```

## File Location

The secrets manager looks for secrets in the following locations (in order):
1. Custom path from `SECRETS_FILE_PATH` environment variable
2. `secrets/{environment}.secrets` in project root
3. `/etc/app/secrets/{environment}.secrets` (production path)

## Format

- One secret per line
- Format: `KEY=value`
- Comments start with `#`
- No quotes needed around values

## Security Best Practices

1. **Never commit secrets to version control**
2. Use strong, randomly generated passwords
3. Rotate secrets regularly
4. Use different secrets for each environment
5. In production, consider using a dedicated secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)
6. Set appropriate file permissions (chmod 600)
7. Use environment variables or secrets files, not both

## Alternative: Environment Variables

If you prefer to use environment variables instead of secrets files, the application will fall back to reading from environment variables. However, secrets files are recommended for better security and management.