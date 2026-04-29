# StrellerMinds Backend

A modern, secure NestJS-based API server powering a blockchain education platform built on the Stellar network. Provides comprehensive user management, course delivery, and seamless Stellar blockchain integration for on-chain learning verification and credentialing.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

StrellerMinds Backend is a production-ready NestJS application that delivers:

### Troubleshooting
- Common startup, database, auth, CORS, contract testing, and deployment issues are covered in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

### Key Features

- 🔐 **Multi-factor Authentication (MFA)** - TOTP-based 2FA
- 🔗 **Blockchain Integration** - Stellar Soroban smart contracts
- 📊 **Database Connection Pooling** - Dynamic sizing with circuit breaker
- 🎥 **Video Streaming** - HLS/DASH with DRM support
- 📧 **Email Services** - SMTP integration with templates
- 🔍 **Full-text Search** - Elasticsearch integration
- 📈 **Performance Monitoring** - Real-time metrics and APM
- 🛡️ **Security Auditing** - Comprehensive logging and compliance

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18.x or 20.x | LTS versions recommended |
| **npm** | 9.x+ | Comes with Node.js |
| **PostgreSQL** | 15+ | Primary database |
| **Git** | Latest | For version control |

### Verify Installation

```bash
node --version    # Should output v18.x.x or v20.x.x
npm --version     # Should output 9.x.x or higher
psql --version    # Should output PostgreSQL 15+
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/StarkMindsHQ/strellerminds-backend.git
cd strellerminds-backend
