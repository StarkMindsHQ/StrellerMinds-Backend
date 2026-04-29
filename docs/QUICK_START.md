# Quick Start Guide - API Documentation

## 🚀 Get Started in 5 Minutes

### 1. Start the Application

```bash
npm install --legacy-peer-deps
npm run build
npm run start:dev
```

### 2. Open Swagger UI

Navigate to: **http://localhost:3000/api/docs**

You'll see the interactive API documentation with all endpoints organized by resource.

### 3. Try an Endpoint

#### Option A: Public Endpoint (No Auth Required)

1. Find `POST /auth/login` under the "Authentication" section
2. Click "Try it out"
3. Enter test credentials:
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePassword123!"
   }
   ```
4. Click "Execute"
5. See the response with user information

#### Option B: Authenticated Endpoint

1. First, login using the endpoint above
2. Copy the JWT token from the response
3. Click the green **"Authorize"** button in the top-right
4. Paste your token in the format: `Bearer <your-token>`
5. Click "Authorize"
6. Find `GET /auth/profile` under "Authentication"
7. Click "Try it out" → "Execute"
8. See your authenticated user profile

### 4. Explore Other Endpoints

Browse through the different resource sections:

- **Health** - System status checks
- **Authentication** - Login, register, password reset
- **MFA** - Multi-factor authentication
- **Users** - User management
- **Courses** - Course management
- **Database** - Database monitoring
- **GDPR** - Data export and deletion

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [API_OVERVIEW.md](./API_OVERVIEW.md) | Complete API reference with all endpoints |
| [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) | How to authenticate and manage tokens |
| [README.md](./README.md) | Documentation overview |

## 🔑 Authentication

### Getting a Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Using the Token

```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <your-token>"
```

## 🧪 Testing Endpoints

### Using cURL

```bash
# Get health status
curl http://localhost:3000/health

# List courses
curl http://localhost:3000/courses

# List users
curl http://localhost:3000/users
```

### Using Postman

1. Import the OpenAPI spec: `http://localhost:3000/api/docs-json`
2. Create a new request
3. Select method and endpoint
4. Add authentication if needed
5. Send request

### Using Insomnia

1. Create new request collection
2. Import from URL: `http://localhost:3000/api/docs-json`
3. Browse endpoints
4. Test requests

## 📖 Common Tasks

### Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "passwordConfirm": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### List Courses with Filters

```bash
curl "http://localhost:3000/courses?category=blockchain&difficulty=beginner&limit=10"
```

### Check Password Strength

```bash
curl -X POST http://localhost:3000/auth/check-password-strength \
  -H "Content-Type: application/json" \
  -d '{
    "password": "MyPassword123!"
  }'
```

### Export User Data (GDPR)

```bash
curl -X GET http://localhost:3000/gdpr/export/user-id \
  -o user-data.json
```

## 🔍 API Endpoints Summary

### Authentication (11 endpoints)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Verify email
- `POST /auth/update-password` - Update password
- `POST /auth/check-password-strength` - Check password strength
- `GET /auth/password-policy` - Get password policy
- `GET /auth/profile` - Get user profile
- `GET /auth/csrf-token` - Get CSRF token

### Token Management (4 endpoints)
- `POST /auth/tokens/logout` - Logout
- `POST /auth/tokens/verify` - Verify token
- `POST /auth/tokens/clear-access` - Clear access token
- `POST /auth/tokens/clear-refresh` - Clear refresh token

### Users (2 endpoints)
- `GET /users` - List users
- `GET /users/:id` - Get user by ID

### Courses (2 endpoints)
- `GET /courses` - List courses
- `GET /courses/:id` - Get course by ID

### Health (4 endpoints)
- `GET /` - Health check
- `GET /health` - Detailed health
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### Database (7 endpoints)
- `GET /database/pool/health` - Pool health
- `GET /database/pool/stats` - Pool stats
- `GET /database/pool/stats/recent` - Recent stats
- `GET /database/pool/utilization` - Pool utilization
- `GET /database/pool/circuit-breaker` - Circuit breaker
- `GET /database/metrics/connection` - Connection status
- `GET /database/metrics/pool-size` - Pool size

### GDPR (4 endpoints)
- `GET /gdpr/export/:userId` - Export user data
- `DELETE /gdpr/users/:userId` - Delete user data
- `GET /gdpr/retention-policies` - Get policies
- `DELETE /gdpr/retention-policies/apply` - Apply policies

### MFA (3 endpoints)
- `POST /auth/mfa/setup` - Setup MFA
- `POST /auth/mfa/verify` - Verify MFA
- `POST /auth/mfa/disable` - Disable MFA

## ⚙️ Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=strellerminds

# Server
PORT=3000
NODE_ENV=development
```

### Swagger UI

- **URL**: `http://localhost:3000/api/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/docs-json`
- **Static Export**: `docs/openapi.json`

## 🛠️ Development

### Regenerate Documentation

After modifying routes or DTOs:

```bash
npm run docs:generate
npm run docs:validate
```

### Run Tests

```bash
npm run test
npm run test:cov
```

### Build for Production

```bash
npm run build
npm run start:prod
```

## 📞 Support

- **Issues**: https://github.com/StarkMindsHQ/StrellerMinds-Backend/issues
- **Email**: contact@strellerminds.com
- **Documentation**: See [README.md](./README.md)

## 🔐 Security Tips

1. **Use HTTPS** in production
2. **Store tokens securely** in httpOnly cookies
3. **Enable MFA** for sensitive accounts
4. **Use strong passwords** (8+ chars, mixed case, numbers, special chars)
5. **Rotate tokens** regularly
6. **Never share tokens** with anyone
7. **Logout** when done

## 🎯 Next Steps

1. ✅ Explore the Swagger UI
2. ✅ Try some endpoints
3. ✅ Read the [Authentication Guide](./AUTHENTICATION_GUIDE.md)
4. ✅ Read the [API Overview](./API_OVERVIEW.md)
5. ✅ Start building your integration

---

**Happy coding! 🚀**
