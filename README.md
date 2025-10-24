# 🚀 NestJS Production-Ready Template

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  Enterprise-grade NestJS template with Authentication, Email Service, Rate Limiting & Best Practices
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#api-endpoints">API Endpoints</a> •
  <a href="#architecture">Architecture</a>
</p>

## ✨ Features

### 🔐 Authentication & Security
- ✅ **JWT Authentication** (Access + Refresh tokens)
- ✅ **User Registration** with email verification
- ✅ **Login/Logout** with token blacklist
- ✅ **Password Management** (Change, Reset, Forgot)
- ✅ **Argon2 Password Hashing** (OWASP recommended)
- ✅ **Role-Based Access Control** (RBAC)
- ✅ **Token Bucket Rate Limiting** (Redis-backed)

### 📧 Email System
- ✅ **SendGrid Integration** with professional templates
- ✅ Welcome email after registration
- ✅ Email verification with secure links
- ✅ Password reset emails (1-hour expiration)
- ✅ Password changed notifications
- ✅ Beautiful HTML templates with CSS

### 🛡️ Validation & Type Safety
- ✅ **Zod Validation** for type-safe input validation
- ✅ Strong password requirements
- ✅ Email format validation
- ✅ UUID validation pipes
- ✅ Custom validation decorators

### 📊 Logging & Monitoring
- ✅ **Pino Logger** (high-performance structured logging)
- ✅ **Request tracking** with unique IDs
- ✅ **Context Local Storage** (CLS) for request context
- ✅ Slow request detection
- ✅ Comprehensive audit logs

### 🗄️ Database & Caching
- ✅ **PostgreSQL** with Prisma ORM
- ✅ **Redis** for caching & rate limiting
- ✅ Database migrations
- ✅ Optimized queries with indexes
- ✅ Multi-tenant architecture ready (workspace-id)

### 🏗️ Architecture & Code Quality
- ✅ Clean Architecture principles
- ✅ Modular design
- ✅ SOLID principles
- ✅ Path aliases (`@/*`)
- ✅ ESLint + Prettier configured
- ✅ Comprehensive error handling

## 📋 Tech Stack

| Technology | Purpose |
|------------|---------|
| NestJS | Backend framework |
| TypeScript | Type-safe development |
| Prisma | ORM & Database toolkit |
| PostgreSQL | Primary database |
| Redis | Caching & Rate limiting |
| Pino | High-performance logging |
| SendGrid | Email delivery |
| Zod | Schema validation |
| JWT | Token-based auth |
| Argon2 | Password hashing |
| CLS | Context management |

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6 (optional, will use in-memory if not available)
- SendGrid API key (optional for dev, will log emails)

### Installation

1. **Clone & Install**
```bash
git clone <your-repo>
cd template-nestjs-redis
npm install
```

2. **Setup Environment**
```bash
# Copy .env and configure
cp .env.example .env

# Edit .env with your values:
# - JWT_SECRET (generate strong random string)
# - DATABASE_URL (PostgreSQL connection)
# - SENDGRID_API_KEY (or leave empty for dev mode)
# - REDIS_URL (or leave empty to use in-memory)
```

3. **Database Setup**
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npx prisma db seed
```

4. **Run Application**
```bash
# Development with hot reload
npm run dev

# Production build
npm run build
npm run start:prod
```

5. **Test the API**
```bash
# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

## 📖 Documentation

Comprehensive guides available:

| Document | Description |
|----------|-------------|
| [AUTH-USER-COMPLETE-GUIDE.md](./AUTH-USER-COMPLETE-GUIDE.md) | Complete API documentation with examples |
| [CLS-GUIDE.md](./CLS-GUIDE.md) | Understanding Context Local Storage & Multi-tenancy |
| [SENIOR-BEST-PRACTICES.md](./SENIOR-BEST-PRACTICES.md) | Best practices & optimization guide |
| [COMPLETION-SUMMARY.md](./COMPLETION-SUMMARY.md) | Quick summary of features & setup |

## 🔗 API Endpoints

### Authentication
```
POST   /auth/register          - Register new user
POST   /auth/login            - Login user
POST   /auth/refresh          - Refresh access token
POST   /auth/logout           - Logout user
GET    /auth/verify-email     - Verify email address
POST   /auth/forgot-password  - Request password reset
POST   /auth/reset-password   - Reset password with token
POST   /auth/change-password  - Change password (authenticated)
```

### User Management
```
GET    /users                 - Get all users (paginated, admin only)
GET    /users/me              - Get current user profile
GET    /users/:id             - Get user by ID (admin only)
PATCH  /users/me              - Update current user
PATCH  /users/:id             - Update user (admin only)
DELETE /users/:id             - Delete user (admin only)
```

See [AUTH-USER-COMPLETE-GUIDE.md](./AUTH-USER-COMPLETE-GUIDE.md) for detailed API documentation.

## 🏗️ Architecture

```
src/
├── common/                 # Shared utilities
│   ├── decorators/        # Custom decorators (@Public, @Roles, etc.)
│   ├── guards/           # Authentication & authorization guards
│   ├── pipes/            # Validation pipes
│   ├── services/         # Shared services (Email)
│   └── utils/            # Helper functions
├── config/               # Configuration files
├── core/                 # Core features (rate-limit)
├── modules/              # Feature modules
│   ├── auth/            # Authentication module
│   └── users/           # User management module
└── prisma/              # Database layer (Prisma)
```

### Design Patterns Used
- **Repository Pattern** - Data access abstraction
- **Service Layer Pattern** - Business logic separation
- **Decorator Pattern** - Metadata & behavior enhancement
- **Strategy Pattern** - Multiple authentication strategies
- **Factory Pattern** - Object creation
- **Singleton Pattern** - Service instances

## 🔐 Security Features

### Password Security
- Argon2id hashing (OWASP recommended)
- Min 8 chars, uppercase, lowercase, number, special char
- Password history (prevents reuse)

### Token Security
- Short-lived access tokens (15m - 1d)
- Long-lived refresh tokens (7d)
- Token rotation on refresh
- Database-backed token blacklist

### Rate Limiting
- Token Bucket algorithm
- Per-user and per-IP limits
- Redis-backed for distributed systems
- Custom limits per endpoint

### Email Security
- Verification tokens (24h expiration)
- Reset tokens (1h expiration)
- One-time use tokens
- Security notifications

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📊 Available Scripts

```bash
npm run dev           # Development with hot reload + type checking
npm run start         # Start application
npm run start:dev     # Development mode with watch
npm run build         # Build for production
npm run start:prod    # Run production build
npm run lint          # Lint code
npm run format        # Format code with Prettier
npm run tc            # Type check
npm run tc:watch      # Type check in watch mode
```

## 🌍 Environment Variables

Create `.env` file with these variables:

```bash
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis (Optional - will use in-memory if not set)
REDIS_URL=redis://localhost:6379

# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# Email (Optional - will log in dev mode)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourapp.com
EMAIL_FROM_NAME=Your App Name

# Rate Limiting
THROTTLE_TTL_SEC=60
THROTTLE_LIMIT=120

# Logging
LOG_LEVEL=debug
PRISMA_LOG_LEVEL=warn
SLOW_REQUEST_THRESHOLD_MS=1000
```

## 📦 Docker Support

### Using Docker Compose

```bash
# Start all services (app, postgres, redis)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Database Only

```bash
# Start only PostgreSQL & Redis
docker-compose up -d postgres redis
```

## 🔄 Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name description

# Apply migrations
npx prisma migrate deploy

# Reset database (DEV ONLY!)
npx prisma migrate reset

# View database in browser
npx prisma studio
```

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Change all JWT secrets to strong random strings
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up Redis cluster
- [ ] Add SendGrid API key
- [ ] Configure CORS for your domain
- [ ] Enable HTTPS/TLS
- [ ] Set proper rate limits
- [ ] Configure monitoring & alerts
- [ ] Set up backup strategy
- [ ] Review security headers

### Deploy to Various Platforms

<details>
<summary>Deploy to Heroku</summary>

```bash
# Install Heroku CLI
heroku login
heroku create your-app-name

# Add PostgreSQL & Redis
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# ... set other variables

# Deploy
git push heroku main
```
</details>

<details>
<summary>Deploy to AWS</summary>

Use AWS Elastic Beanstalk, ECS, or EC2:
1. Build Docker image
2. Push to ECR
3. Deploy via ECS/Elastic Beanstalk
4. Configure RDS (PostgreSQL) and ElastiCache (Redis)
</details>

<details>
<summary>Deploy to DigitalOcean</summary>

```bash
# Use App Platform
doctl apps create --spec .do/app.yaml

# Or use Droplet + Docker
# SSH to droplet
git clone <repo>
docker-compose -f docker-compose.prod.yml up -d
```
</details>

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow commit message conventions
- Run `npm run lint` before committing

## 📚 Learning Resources

### NestJS
- [Official Documentation](https://docs.nestjs.com/)
- [NestJS Fundamentals Course](https://www.udemy.com/course/nestjs-zero-to-hero/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### Architecture
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)

## 🐛 Troubleshooting

### Common Issues

**Issue: TypeScript errors after npm install**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue: Prisma client not generated**
```bash
npx prisma generate
```

**Issue: Database connection fails**
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
# Check firewall/network settings
```

**Issue: Redis connection fails**
```bash
# Redis is optional - app will work without it
# Check REDIS_URL if you want to use Redis
# Will fall back to in-memory storage
```

## 📄 License

This project is [MIT licensed](LICENSE).

## 👨‍💻 Author

Built with ❤️ by developers who care about quality

---

## ⭐ Show Your Support

If this template helped you, please give it a ⭐️!

## 📞 Contact

- Documentation: See guide files in project root
- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Questions: Create a discussion or issue

---

**Ready to build something amazing? Let's go! 🚀**
