# Repository Structure

## 📁 Directory Organization
```
bubble-backend-api/
├── 📂 config/              # Application configuration
│   ├── constants.js        # App constants & enums
│   ├── database.js         # Database connection
│   ├── env.js             # Environment validation
│   └── swagger.js         # API documentation config
│
├── 📂 controllers/         # Request handlers
│   ├── ai.controller.js
│   ├── auth.controller.js
│   ├── file.controller.js
│   ├── messaging.controller.js
│   ├── payment.controller.js
│   ├── user.controller.js
│   └── workflow.controller.js
│
├── 📂 database/            # Database schemas & migrations
│   ├── migrations/         # Future migrations
│   ├── migrate.js         # Migration runner
│   ├── rls_policies.sql   # Row Level Security
│   ├── schema.sql         # Complete database schema
│   └── seed.sql           # Test data
│
├── 📂 docs/                # API documentation
│   ├── API_DOCUMENTATION.md
│   └── postman_collection.json
│
├── 📂 logs/                # Application logs (gitignored)
│
├── 📂 middleware/          # Express middleware
│   ├── errorHandler.js    # Global error handling
│   ├── requestLogger.js   # Request logging
│   └── security.js        # Security middleware
│
├── 📂 routes/              # API route definitions
│   ├── ai.routes.js
│   ├── auth.routes.js
│   ├── file.routes.js
│   ├── health.routes.js
│   ├── index.js           # Route aggregator
│   ├── messaging.routes.js
│   ├── payment.routes.js
│   ├── user.routes.js
│   └── workflow.routes.js
│
├── 📂 scripts/             # Deployment scripts
│   ├── deploy.sh          # Automated deployment
│   ├── start.sh           # Multi-mode startup
│   └── stop.sh            # Graceful shutdown
│
├── 📂 services/            # Business logic layer
│   ├── ai.service.js
│   ├── auth.service.js
│   ├── file.service.js
│   ├── messaging.service.js
│   ├── payment.service.js
│   ├── user.service.js
│   └── workflow.service.js
│
├── 📂 tests/               # Test suite
│   ├── integration/       # API integration tests
│   ├── unit/             # Unit tests
│   ├── README.md         # Testing guide
│   └── setup.js          # Test configuration
│
├── 📂 tools/               # Development & audit tools
│   ├── testing/          # Testing utilities
│   │   └── test-frontend.html
│   ├── audit-checklist.sh
│   ├── check-gitignore.sh
│   ├── generate-tree.sh
│   ├── git-status-check.sh
│   ├── verify-backend.sh
│   └── README.md
│
├── 📂 utils/               # Helper utilities
│   ├── encryption.js      # AES-256 encryption
│   ├── helpers.js         # Common helpers
│   └── logger.js          # Winston logger
│
├── 📂 workers/             # Background job processors
│   ├── jobs/             # Job implementations
│   │   ├── ai.job.js
│   │   ├── email.job.js
│   │   ├── file.job.js
│   │   └── workflow.job.js
│   ├── private/          # Client secrets (gitignored)
│   ├── index.js          # Worker entry point
│   ├── queue.js          # Queue configuration
│   └── README.md
│
├── 📄 .dockerignore        # Docker exclusions
├── 📄 .env.example         # Environment template
├── 📄 .eslintrc.js         # ESLint configuration
├── 📄 .gitignore           # Git exclusions
├── 📄 .nvmrc               # Node version
├── 📄 CHANGELOG.md         # Version history
├── 📄 CLIENT_INTEGRATION_GUIDE.md
├── 📄 DELIVERY_REPORT.md
├── 📄 Dockerfile           # Container configuration
├── 📄 HANDOVER.md          # Deployment guide
├── 📄 PROJECT_SUMMARY.md
├── 📄 README.md            # Main documentation
├── 📄 REPOSITORY_STRUCTURE.md  # This file
├── 📄 TWILIO_INTEGRATION.md
├── 📄 app.js               # Express app setup
├── 📄 docker-compose.yml   # Multi-container setup
├── 📄 jest.config.js       # Test configuration
├── 📄 package-lock.json    # Dependency lock
├── 📄 package.json         # Project manifest
├── 📄 pm2.config.js        # Process manager config
└── 📄 server.js            # Application entry point
```

## 📊 Statistics

- **Total Directories:** 20
- **Total Files:** 92
- **JavaScript Files:** 55 (4,402 lines)
- **SQL Files:** 3 (466 lines)
- **Test Files:** 9 (45 tests)
- **Documentation:** 8 guides
- **Tools:** 6 scripts

## 🎯 Key Principles

1. **Separation of Concerns:** Routes → Controllers → Services
2. **Security First:** Multiple layers of protection
3. **Well Documented:** Every component explained
4. **Fully Tested:** 100% critical path coverage
5. **Production Ready:** Docker, PM2, monitoring included

## 🔐 Gitignored Items

- `node_modules/` - Dependencies
- `.env` - Secrets
- `logs/` - Log files
- `workers/private/` - Client business logic
- `coverage/` - Test coverage reports

## ✅ Clean Repository

- No sensitive data committed
- No build artifacts
- No OS-specific files
- Professional structure
- Ready for deployment
