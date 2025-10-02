# Email Tracking System

## Overview

Provides privacy-conscious analytics for emails sent through the platform.

## Features

- Open tracking via 1x1 transparent pixel
- Click tracking with HMAC-signed redirects
- Privacy controls (minimal metadata)
- JWT-protected analytics endpoint

## Configuration

Add to your environment:

```env
EMAIL_TRACKING_ENABLED=true
EMAIL_TRACKING_SECRET=<minimum-32-character-secret>
EMAIL_TRACKING_BASE_URL=http://localhost:3000
```

## Usage

- Sending tracked emails occurs automatically unless `skipTracking` is set in `sendImmediate`.
- Analytics endpoint (JWT required): `GET /email/track/analytics/:emailId`.

## Endpoints

- `GET /email/track/open/:token.png` — serves a 1x1 PNG and records open
- `GET /email/track/click/:token?url=<encoded>&sig=<hmac>` — verifies and redirects

## Notes

- IPs are minimally collected and can be anonymized upstream via proxies.
- Ensure `EMAIL_TRACKING_SECRET` is identical across services generating/validating links.
