# StrellerMinds Backend

StrellerMinds Backend is a modern NestJS-based API server that powers a blockchain education platform built on the Stellar network. It provides secure user management, course delivery, and seamless Stellar blockchain integration for on-chain learning verification and credentialing.

---

## 🚀 Features

- **Modern Architecture**: Built with NestJS
- **Stellar Integration**: Blockchain credential verification
- **RESTful APIs**: Clean, documented endpoints
- **TypeScript**: Full type safety
- **Modular Design**: Scalable architecture
- **Swagger Docs**: Auto-generated API docs
- **Testing**: Jest unit & integration tests
- **Database Connection Pooling**: Optimized DB performance
- **APM Monitoring**: DataDog & New Relic integration
- **Performance Profiling**: CPU, memory, and latency tracking

---

## 📊 Monitoring & Performance

### Database Connection Pooling
- Dynamic pool sizing
- Real-time monitoring
- Circuit breaker protection
- Load-tested (50+ concurrent connections)
- Endpoints:
  - `/database/pool/health`
  - `/database/pool/stats`

### Troubleshooting
- Common startup, database, auth, CORS, contract testing, and deployment issues are covered in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

## 🛠️ Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL + TypeORM
- **Blockchain**: Stellar
- **Auth**: JWT
- **Docs**: Swagger
- **Testing**: Jest
- **Monitoring**: DataDog / New Relic

---

## 📋 Prerequisites

- Node.js v18+
- PostgreSQL
- npm / yarn
- Git

---

## 🚀 Quick Start

### Clone repo
```bash
git clone https://github.com/StarkMindsHQ/strellerminds-backend.git
cd strellerminds-backend
