# Configuration Files

This directory contains environment-specific configuration files for the application.

## Available Configurations

- `development.json` - Development environment configuration
- `staging.json` - Staging environment configuration
- `production.json` - Production environment configuration

## Usage

The application automatically loads the appropriate configuration file based on the `NODE_ENV` environment variable:

```bash
# Load development config
NODE_ENV=development npm start

# Load staging config
NODE_ENV=staging npm start

# Load production config
NODE_ENV=production npm start
```

## Configuration Structure

Each configuration file follows this structure:

```json
{
  "app": {
    "name": "Application name",
    "version": "Version number",
    "environment": "Environment name"
  },
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "cors": {
      "enabled": true,
      "origins": ["allowed origins"]
    },
    "rateLimit": {
      "windowMs": 900000,
      "maxRequests": 100
    }
  },
  "logging": {
    "level": "debug|info|warn|error",
    "format": "json|text",
    "file": {
      "enabled": true,
      "path": "log file path",
      "maxSize": "20MB",
      "maxFiles": 14
    }
  },
  "features": {
    "featureName": true|false
  }
}
```

## Environment-Specific Settings

### Development

- Debug logging enabled
- Relaxed security settings
- Local CORS origins
- Higher rate limits

### Staging

- Info-level logging
- SSL required for database
- Production-like security
- Moderate rate limits

### Production

- Warning-level logging only
- Strict security settings
- Specific CORS origins
- Lower rate limits

## Notes

- **Do not include sensitive data** (passwords, API keys) in these files
- Sensitive data should be stored in `secrets/{environment}.secrets` files
- Configuration files are version controlled
- See `.env.template` for environment variable options
- See `docs/CONFIGURATION.md` for detailed documentation
