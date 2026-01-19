# StrellerMinds Backend

StrellerMinds Backend is a modern NestJS-based API server that powers a blockchain education platform built on the Stellar network. This backend provides a robust foundation for educational platforms focused on blockchain technology, offering secure user management, course delivery, and seamless Stellar blockchain integration for on-chain learning verification and credentialing.

The platform is designed for educational institutions, online learning platforms, and blockchain training providers who want to offer verifiable, on-chain certificates and credentials while maintaining a traditional learning management system experience.

## 🚀 Features

- **Modern Architecture**: Built with NestJS for scalable, maintainable code
- **Stellar Integration**: Seamless blockchain interactions for credential verification
- **RESTful APIs**: Clean, well-documented endpoints for all platform features
- **TypeScript**: Full type safety and enhanced developer experience
- **Modular Design**: Clean separation of concerns with NestJS modules
- **Auto-generated Documentation**: Interactive Swagger/OpenAPI documentation
- **Comprehensive Testing**: Unit and integration tests with Jest
- **Environment Configuration**: Flexible configuration management

## 🛠️ Tech Stack

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Blockchain**: Stellar Network
- **Authentication**: JWT-based auth
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn** package manager
- **PostgreSQL** database (v12 or higher)
- **Git** for version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/StarkMindsHQ/StrellerMinds-Backend.git
cd strellerminds-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Required: Database connection, JWT secret, Stellar network settings
```

### 4. Database Setup

Ensure PostgreSQL is running and create the database:

```sql
CREATE DATABASE strellerminds;
```

### 5. Start the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`

### 6. Verify Installation

```bash
# Check if server is running
curl http://localhost:3000

# Should return: {"message": "Hello World!"}
```

## 📚 Available Scripts

```bash
# Development
npm run start:dev          # Start in development mode with hot reload
npm run start:debug        # Start in debug mode
npm run start              # Start in production mode

# Building
npm run build              # Build the application
npm run build:prod         # Build for production

# Testing
npm run test               # Run unit tests
npm run test:cov           # Run tests with coverage report
npm run test:e2e           # Run end-to-end tests
npm run test:watch         # Run tests in watch mode

# Code Quality
npm run lint               # Lint the codebase
npm run lint:fix           # Fix linting issues automatically
npm run format             # Format code with Prettier
```

## 🔧 Environment Configuration

Create a `.env` file from `.env.example` and configure these essential variables:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=strellerminds

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Stellar Blockchain
STELLAR_NETWORK=TESTNET
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Application
PORT=3000
NODE_ENV=development
```

For a complete list of all available environment variables, refer to `.env.example`.

## 🏗️ Project Structure

```
src/
├── app.controller.ts          # Main application controller
├── app.module.ts            # Root application module
├── app.service.ts           # Core application service
├── main.ts                 # Application entry point
├── common/                 # Shared utilities and decorators
│   ├── decorators/
│   └── errors/
├── config/                 # Configuration files
├── modules/                # Feature modules
│   ├── auth/              # Authentication & authorization
│   ├── users/             # User management
│   ├── courses/           # Course management
│   ├── blockchain/        # Stellar integration
│   └── enrollment/        # Course enrollment
└── utils/                 # Helper utilities
```

## 📖 API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/api`
- **JSON Spec**: `http://localhost:3000/api-json`

## 🧪 Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:cov

# Run specific test file
npm run test -- auth/auth.service.spec.ts

# Run tests in watch mode for development
npm run test:watch
```

## 🔒 Security Considerations

- All sensitive data should be stored in environment variables
- JWT secrets must be strong and unique
- Database connections should use SSL in production
- API endpoints should implement proper authentication and authorization
- Regular security audits are recommended

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Docker Deployment

```bash
# Build Docker image
docker build -t strellerminds-backend .

# Run container
docker run -p 3000:3000 strellerminds-backend
```

### Environment-Specific Configurations

- **Development**: Hot reload, detailed logging, relaxed security
- **Staging**: Production-like environment for testing
- **Production**: Optimized performance, enhanced security

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes with proper testing
4. **Follow** the existing code style and patterns
5. **Run** tests and ensure they pass: `npm run test`
6. **Commit** your changes with descriptive messages
7. **Push** to your fork: `git push origin feature/amazing-feature`
8. **Create** a Pull Request

### Code Quality Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Include tests for new functionality
- Ensure all tests pass before submitting
- Follow the existing code formatting (Prettier)

### Reporting Issues

- Use the GitHub issue tracker
- Provide detailed reproduction steps
- Include environment details
- Add relevant logs or screenshots

## 📚 Helpful Links

- **NestJS Documentation**: https://docs.nestjs.com/
- **Stellar Developers**: https://developers.stellar.org/
- **TypeORM Documentation**: https://typeorm.io/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Module Import Errors**
   - Run `npm install` to ensure dependencies
   - Check TypeScript configuration
   - Verify file paths and module names

3. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing processes: `lsof -ti:3000 | xargs kill`

### Getting Help

- Check existing GitHub issues
- Review the documentation
- Join our community discussions
- Contact maintainers for support

## 📄 License

This project is **UNLICENSED** - all rights reserved.

## 🙏 Acknowledgments

- NestJS team for the excellent framework
- Stellar Development Foundation for blockchain infrastructure
- Open source community for valuable tools and libraries

---

**Built with ❤️ for the blockchain education community**
