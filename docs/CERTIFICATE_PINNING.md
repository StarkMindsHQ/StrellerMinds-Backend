# Certificate Pinning Guide

## Server-side (already implemented)

The `CertificatePinningMiddleware` injects `Public-Key-Pins-Report-Only` and `Expect-CT` headers.

Set the environment variable:
```
CERT_PIN_SHA256=<base64-sha256-of-your-spki>
```

Generate the pin hash:
```bash
openssl s_client -connect yourdomain.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | base64
```

> Upgrade from `Public-Key-Pins-Report-Only` to `Public-Key-Pins` only after validating the hash in production to avoid bricking clients during certificate rotation.

---

## Mobile client (React Native)

Install:
```bash
npm install react-native-ssl-pinning
```

Usage:
```js
import { fetch } from 'react-native-ssl-pinning';

fetch('https://api.yourdomain.com/auth/login', {
  method: 'POST',
  sslPinning: {
    certs: ['cert_filename'], // place .cer file in android/app/src/main/assets & ios bundle
  },
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

### Pin rotation
Always include **two pins** (current + backup) to allow rotation without downtime:
```
pin-sha256="currentHash="; pin-sha256="backupHash="; max-age=5184000
```
