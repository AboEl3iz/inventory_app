# Inventory Management System

A comprehensive, enterprise-grade inventory management system built with NestJS, TypeORM, and PostgreSQL. This application provides complete inventory tracking, supplier management, purchase order processing, financial reporting, and automated scheduling capabilities for multi-branch retail operations.

---

## 1. Project Overview

The Inventory Management System is a full-featured backend API designed to handle complex inventory operations across multiple branches. It provides:

### Core Features
- **Product Management**: Complete product catalog with variants, attributes, and Cloudinary image storage
- **Multi-Branch Inventory Tracking**: Real-time stock levels across multiple warehouse locations
- **Supplier Management**: Supplier information, pricing, and automated reorder recommendations
- **Purchase Order Processing**: End-to-end PO management from creation to completion
- **Invoice Management**: Invoice creation, tracking, and payment processing
- **Financial Reporting**: Daily sales reports, weekly revenue summaries, monthly P&L, and quarterly tax reports
- **Automated Scheduling**: Cron jobs for low stock alerts, reorder suggestions, and financial reporting
- **Employee Performance Tracking**: Cashier and manager performance analytics
- **Role-Based Access Control**: Admin, Manager, and Cashier roles with granular permissions
- **Real-Time Stock Movement Tracking**: Complete audit trail of all inventory movements
- **Event-Driven Architecture**: Event emitter for system notifications and email alerts
- **Caching Layer**: Redis-based caching for frequently accessed data
- **Structured Logging**: Winston logger for comprehensive application tracking

### Business Capabilities
- Low stock alerts and automatic reorder suggestions
- Sales target monitoring and performance analysis
- Multi-branch sales reporting and analytics
- Employee productivity metrics
- Data archival and cleanup
- End-of-day reconciliation
- Tax and compliance reporting

---

## 2. Tech Stack

### Backend Framework
- **NestJS** v11.0.1 - Progressive Node.js framework for building scalable server-side applications
- **TypeScript** v5.9.3 - Type-safe JavaScript for production applications

### Database
- **PostgreSQL** v8.16.3 - Robust relational database
- **TypeORM** v0.3.27 - ORM for type-safe database operations with PostgreSQL support

### Authentication & Security
- **JWT (@nestjs/jwt)** v11.0.1 - Token-based authentication with Bearer scheme
- **Bcrypt** v6.0.0 - Password hashing and validation

### Job Queue & Scheduling
- **BullMQ** v5.62.0 - Distributed job queue for async processing
- **@nestjs/schedule** v6.0.1 - Cron-based task scheduling
- **Redis** - Backend for BullMQ and caching

### API Documentation
- **Swagger (@nestjs/swagger)** v11.2.1 - OpenAPI documentation with interactive UI
- **SwaggerUI** - Interactive API testing at `/api/docs`

### Caching
- **Cache-Manager** v7.2.4 - Cache abstraction layer
- **Cache-Manager-Redis-Yet** v5.1.5 - Redis backend for caching

### Email & Notifications
- **Nodemailer** v7.0.10 - Email sending
- **Email-Templates** v12.0.3 - Template-based email rendering
- **Handlebars** v4.7.8 - Template engine
- **Pug** v3.0.3 - Additional template support

### Cloud Services
- **Cloudinary** v2.8.0 - Image hosting and CDN

### Logging
- **Winston** v3.18.3 - Structured logging framework
- **Nest-Winston** v1.10.2 - NestJS Winston integration

### Data Validation
- **Class-Validator** v0.14.2 - Decorator-based validation for DTOs
- **Class-Transformer** v0.5.1 - Data transformation and serialization

### Utilities
- **Moment.js** v2.30.1 - Date/time manipulation
- **UUID** v13.0.0 - Unique identifier generation
- **@faker-js/faker** v10.1.0 - Fake data generation for testing

### Testing
- **Jest** v30.0.0 - Testing framework
- **Supertest** v7.0.0 - HTTP assertion library
- **ts-jest** v29.2.5 - TypeScript support for Jest

### Development Tools
- **ESLint** v9.18.0 - Code linting
- **Prettier** v3.4.2 - Code formatting
- **Docker Compose** - Container orchestration

---

## 3. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REST API Layer (NestJS)                       │
│              Swagger/OpenAPI Documentation @ /api/docs           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                        14 Feature Modules                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Products │ Categories │ Inventory │ Stock │ Suppliers  │  │
│  │ Purchases │ Invoices │ Users │ Auth │ Branches │ Events │  │
│  │ Scheduler │ Reports │ Analytics                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
┌───▼──────────────┐ ┌──────▼──────────┐ ┌──────────▼──────┐
│  PostgreSQL DB   │ │  Redis Cache    │ │   Redis Queue   │
│                  │ │  (Cache-Manager)│ │   (BullMQ)      │
│  14 Entities     │ │                 │ │                 │
│  Type-Safe ORM   │ │  TTL Support    │ │ Job Processing  │
└──────────────────┘ └─────────────────┘ └─────────────────┘
    │
    └─── Cloudinary (Image Storage)
    └─── Email Service (Nodemailer)
    └─── Event Emitter
    └─── Winston Logging
```

### Module Architecture

#### 1. **Authentication & Users Module**
- User registration, login, token refresh
- Role-based access control (Admin, Manager, Cashier)
- JWT Bearer token validation
- User profile management

#### 2. **Products Module**
- Product CRUD operations
- Product Variants (SKU-based)
- Product Attributes (size, color, etc.)
- Cloudinary image integration
- Search and filtering capabilities

#### 3. **Categories Module**
- Hierarchical category management
- Category statistics and analytics
- Search functionality
- Product categorization

#### 4. **Inventory Module**
- Multi-branch inventory tracking
- Stock level management
- Minimum threshold configuration
- Stock adjustment and transfers between branches
- Low stock alert tracking

#### 5. **Stock Module**
- Stock movement recording (additions, removals, transfers)
- Audit trail for all stock changes
- CRUD operations for stock records

#### 6. **Suppliers Module**
- Supplier information management
- Contact details and pricing
- Reorder recommendations
- Supplier performance tracking

#### 7. **Purchases Module**
- Purchase order creation and management
- Purchase order items (variants, quantities)
- Status tracking (pending, completed, cancelled)
- Supplier linkage

#### 8. **Invoices Module**
- Invoice generation from sales
- Invoice items tracking
- Payment processing (multiple payment methods)
- Invoice status management
- Financial reconciliation

#### 9. **Branches Module**
- Multi-branch location management
- Branch-specific inventory tracking
- Manager assignment to branches
- Branch performance statistics

#### 10. **Events Module**
- System event tracking and storage
- Event type categorization
- Event history and audit trail

#### 11. **Scheduler Module**
- Automated task scheduling using Cron expressions
- Low stock alerts and reorder suggestions
- Daily/weekly/monthly financial reporting
- Performance monitoring and alerts
- Data cleanup and maintenance

#### 12. **Reports Module**
- Daily sales reports by branch
- Weekly revenue analysis
- Monthly profit & loss statements
- Quarterly tax summaries
- Forecasting data generation

#### 13. **Analytics Module**
- Dashboard metrics and KPIs
- Sales trend analysis
- Inventory insights
- Performance analytics

#### 14. **Common Utilities**
- Guards for authentication and authorization
- Interceptors for request/response handling
- Filters for error handling
- Shared constants and configurations

### Data Flow Architecture

```
User Request → JWT Validation → Role Authorization → Controller
    ↓
Business Logic → Repository (TypeORM) → Database Query
    ↓
Event Emission → Event Listeners → Email/Notifications
    ↓
Cache Layer → Redis Cache Update
    ↓
Response → JSON Serialization → Client
```

### Authentication Flow

1. User registers with email and password (hashed with Bcrypt)
2. User logs in and receives JWT token with role information
3. Token included in Authorization header: `Bearer <JWT_TOKEN>`
4. AuthenticationGuard validates JWT signature and expiry
5. AuthorizationGuard checks user role against endpoint requirements
6. Roles: Admin (all access), Manager (branch-level access), Cashier (limited access)

### Event-Driven System

Key events emitted through EventEmitter2:
- `inventory.low-stock` - When stock falls below minimum threshold
- `inventory.reorder-suggestion` - Automated reorder recommendations
- `report.daily-sales` - End of day sales report
- `report.weekly-sales` - Weekly revenue report
- `report.monthly-pl` - Monthly P&L report
- `report.tax-summary` - Quarterly tax summary
- `alert.sales-target` - Sales target underperformance alerts
- `report.employee-performance` - Weekly employee performance summary

### Caching Strategy

- **Cache Layer**: Redis via Cache-Manager
- **TTL Configuration**: Configurable per endpoint
- **Cache Keys**: Prefixed by entity type and ID for granularity
- **Cache Invalidation**: On entity creation/update/deletion events
- **Use Cases**: 
  - Product listings
  - Inventory summaries
  - Branch statistics
  - Sales metrics

### Error Handling

- Global exception filter for consistent error responses
- Validation errors with detailed field information
- Business logic errors with appropriate HTTP status codes
- Database constraint violations properly handled
- Logging of all errors for audit trail

---

## 4. Folder Structure

```
inventory_app/
├── src/
│   ├── main.ts                          # Application bootstrap and Swagger setup
│   ├── app.module.ts                    # Root module with all imports
│   ├── app.controller.ts                # Root controller for health checks
│   ├── app.service.ts                   # Root service
│   │
│   ├── config/                          # Configuration files
│   │   ├── typeorm.config.ts            # TypeORM database configuration
│   │   ├── jwt.config.ts                # JWT authentication setup
│   │   ├── email.config.ts              # Email service configuration
│   │   └── cloudinary.config.ts         # Cloudinary image service
│   │
│   ├── common/                          # Shared utilities
│   │   ├── guards/                      # Authentication & authorization guards
│   │   ├── interceptors/                # Request/response interceptors
│   │   ├── filters/                     # Exception filters
│   │   ├── decorators/                  # Custom decorators
│   │   └── constants/                   # Application constants
│   │
│   ├── module/                          # Feature modules (14 total)
│   │   │
│   │   ├── products/                    # Product management
│   │   │   ├── entities/
│   │   │   │   ├── product.entity.ts
│   │   │   │   ├── product-variant.entity.ts
│   │   │   │   └── product-attribute.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-product.dto.ts
│   │   │   │   ├── create-variant.dto.ts
│   │   │   │   ├── create-attribute.dto.ts
│   │   │   │   └── update-product.dto.ts
│   │   │   ├── products.controller.ts   # CRUD + variant/attribute endpoints
│   │   │   ├── products.service.ts      # Business logic
│   │   │   └── products.module.ts
│   │   │
│   │   ├── categories/                  # Category management
│   │   │   ├── entities/
│   │   │   │   └── category.entity.ts
│   │   │   ├── dto/
│   │   │   │   └── create-category.dto.ts
│   │   │   ├── categories.controller.ts
│   │   │   ├── categories.service.ts
│   │   │   └── categories.module.ts
│   │   │
│   │   ├── inventory/                   # Inventory tracking
│   │   │   ├── entities/
│   │   │   │   └── inventory.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-inventory.dto.ts
│   │   │   │   ├── adjust-stock.dto.ts
│   │   │   │   └── transfer-stock.dto.ts
│   │   │   ├── inventory.controller.ts
│   │   │   ├── inventory.service.ts
│   │   │   └── inventory.module.ts
│   │   │
│   │   ├── stock/                       # Stock movements
│   │   │   ├── entities/
│   │   │   │   └── stock-movement.entity.ts
│   │   │   ├── dto/
│   │   │   │   └── create-stock.dto.ts
│   │   │   ├── stock.controller.ts
│   │   │   ├── stock.service.ts
│   │   │   └── stock.module.ts
│   │   │
│   │   ├── suppliers/                   # Supplier management
│   │   │   ├── entities/
│   │   │   │   └── supplier.entity.ts
│   │   │   ├── dto/
│   │   │   │   └── create-supplier.dto.ts
│   │   │   ├── suppliers.controller.ts
│   │   │   ├── suppliers.service.ts
│   │   │   └── suppliers.module.ts
│   │   │
│   │   ├── purchases/                   # Purchase order management
│   │   │   ├── entities/
│   │   │   │   ├── purchase.entity.ts
│   │   │   │   └── purchase-item.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-purchase.dto.ts
│   │   │   │   └── create-purchase-item.dto.ts
│   │   │   ├── purchases.controller.ts
│   │   │   ├── purchases.service.ts
│   │   │   └── purchases.module.ts
│   │   │
│   │   ├── invoices/                    # Invoice management
│   │   │   ├── entities/
│   │   │   │   ├── invoice.entity.ts
│   │   │   │   └── invoice-item.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-invoice.dto.ts
│   │   │   │   └── invoice-item.dto.ts
│   │   │   ├── invoices.controller.ts
│   │   │   ├── invoices.service.ts
│   │   │   └── invoices.module.ts
│   │   │
│   │   ├── users/                       # User management & auth
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── login-user.dto.ts
│   │   │   │   └── update-user.dto.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   │
│   │   ├── auth/                        # Authentication records
│   │   │   ├── entities/
│   │   │   │   └── auth.entity.ts
│   │   │   ├── dto/
│   │   │   │   └── create-auth.dto.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── branches/                    # Multi-branch management
│   │   │   ├── entities/
│   │   │   │   └── branch.entity.ts
│   │   │   ├── dto/
│   │   │   │   └── create-branch.dto.ts
│   │   │   ├── branches.controller.ts
│   │   │   ├── branches.service.ts
│   │   │   └── branches.module.ts
│   │   │
│   │   ├── events/                      # Event tracking
│   │   │   ├── entities/
│   │   │   │   └── event.entity.ts
│   │   │   ├── dto/
│   │   │   │   └── create-event.dto.ts
│   │   │   ├── events.controller.ts
│   │   │   ├── events.service.ts
│   │   │   └── events.module.ts
│   │   │
│   │   ├── scheduler/                   # Task scheduling (BullMQ + Cron)
│   │   │   ├── scheduler.service.ts     # 10+ scheduled tasks
│   │   │   ├── notification.service.ts  # Email notifications
│   │   │   ├── scheduler.controller.ts
│   │   │   ├── scheduler.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── reports/                     # Financial reporting
│   │   │   ├── reports.service.ts
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.module.ts
│   │   │   └── dto/
│   │   │
│   │   └── analytics/                   # Analytics & insights
│   │       ├── analytics.service.ts
│   │       ├── analytics.controller.ts
│   │       ├── analytics.module.ts
│   │       └── dto/
│   │
│   ├── shared/                          # Shared utilities
│   │   ├── cloudinary.ts                # Image upload/storage
│   │   ├── encryption.ts                # Encryption utilities
│   │   ├── mail/                        # Email templates
│   │   │   ├── templates/               # HTML email templates
│   │   │   ├── low-stock-alert.ts
│   │   │   ├── daily-report.ts
│   │   │   └── ...
│   │   ├── event.constants.ts           # Event type definitions
│   │   └── decorators/                  # Custom decorators
│   │
│   └── test/                            # Unit tests
│       └── fixtures/                    # Test data
│
├── test/                                # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── postgres_data/                       # PostgreSQL data volume (Docker)
│
├── package.json                         # Dependencies & scripts
├── tsconfig.json                        # TypeScript configuration
├── tsconfig.build.json                  # TypeScript build configuration
├── eslint.config.mjs                    # ESLint configuration
├── nest-cli.json                        # NestJS CLI configuration
├── docker-compose.yml                   # Docker services (PostgreSQL, Redis)
└── README.md                            # This file
```

### Key Files

| File | Purpose |
|------|---------|
| `main.ts` | Application entry point with Swagger setup |
| `app.module.ts` | Root module importing all 14 feature modules |
| `typeorm.config.ts` | PostgreSQL connection and entity registration |
| `jwt.config.ts` | JWT token configuration and strategy |
| `cloudinary.config.ts` | Image storage and CDN setup |

---

## 5. How to Run Project

### Prerequisites

- **Node.js**: v18.x or higher
- **npm** or **yarn**: Package manager
- **Docker & Docker Compose**: For PostgreSQL and Redis containers
- **PostgreSQL** v13+: Database server (via Docker or local)
- **Redis** v6+: In-memory cache and job queue (via Docker or local)

### Environment Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd inventory_app
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env` file** in the project root
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h

# PostgreSQL Configuration
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=inventory_db
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@inventory.com

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Application URLs
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

4. **Start Docker containers** (PostgreSQL and Redis)
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Redis cache on port 6379

Verify containers are running:
```bash
docker-compose ps
```

### Running the Application

#### Development Mode
```bash
npm run start:dev
```
- Runs with auto-restart on file changes
- Available at `http://localhost:3000`
- Swagger documentation at `http://localhost:3000/api/docs`

#### Production Build
```bash
npm run build
npm run start:prod
```

#### Debug Mode
```bash
npm run start:debug
```
- Starts with debugger on port 9229
- Use Chrome DevTools or VS Code debugger

### Database Setup

TypeORM synchronization is enabled via `DB_SYNCHRONIZE=true`. This automatically:
- Creates tables from entities
- Adds relationships and constraints
- Handles schema updates on app restart

For manual migration:
```bash
npm run typeorm migration:generate -- -n InitialSchema
npm run typeorm migration:run
```

### Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### API Access

#### Swagger UI (Interactive Documentation)
```
http://localhost:3000/api/docs
```

#### Authentication Flow
1. Register new user: `POST /api/v1/users/register`
2. Login: `POST /api/v1/users/login`
3. Copy JWT token from response
4. Click "Authorize" in Swagger UI
5. Paste token as: `Bearer <token>`
6. Access protected endpoints

### Verifying Installation

1. **Check server status**
```bash
curl http://localhost:3000/health
```

2. **Access Swagger documentation**
```
http://localhost:3000/api/docs
```

3. **Check database connection**
```bash
docker exec postgres_container psql -U postgres -d inventory_db -c "SELECT 1"
```

4. **Check Redis connection**
```bash
docker exec redis_container redis-cli ping
```

---

## 6. Scheduler Implementation & Future Improvements

### Current Implementation

The Scheduler module implements automated task scheduling using two mechanisms:

#### A. **Cron-Based Scheduling (@nestjs/schedule)**

Uses standard cron expressions for time-based task execution.

##### Implemented Scheduled Tasks:

1. **Low Stock Management (Every Hour)**
```typescript
@Cron(CronExpression.EVERY_HOUR)
async checkLowStock()
```
- Queries inventory items where quantity < minThreshold
- Emits `inventory.low-stock` events
- Updates alert tracking for deduplication
- Logs all low stock items
- **Future Improvement**: Add configurable threshold per product category

2. **Reset Low Stock Alerts (Daily at Midnight)**
```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async resetLowStockAlerts()
```
- Clears alert flags to allow new alerts next cycle
- Prevents alert fatigue
- **Future Improvement**: Add rate limiting per supplier

3. **Generate Reorder Suggestions (Weekly)**
```typescript
@Cron(CronExpression.EVERY_WEEK)
async generateReorderSuggestions()
```
- Groups low stock items by supplier
- Calculates suggested reorder quantities (based on consumption rate)
- Emits `inventory.reorder-suggestion` events
- **Future Improvement**: Machine learning for demand forecasting

4. **End of Day Sales Report (11:55 PM)**
```typescript
@Cron('55 23 * * *')
async endOfDaySalesReport()
```
- Generates daily revenue summaries per branch
- Sends reports to managers and admins
- Emits `report.daily-sales` event
- **Future Improvement**: Real-time dashboard instead of daily batches

5. **Weekly Revenue Report (Every Monday at 9 AM)**
```typescript
@Cron('0 9 * * 1')
async weeklyRevenueReport()
```
- Aggregates previous week's revenue
- Sends to admin users only
- Emits `report.weekly-sales` event
- **Future Improvement**: Trend analysis and YoY comparisons

6. **Monthly P&L Report (1st of Month at 10 AM)**
```typescript
@Cron('0 10 1 * *')
async monthlyProfitLossReport()
```
- Calculates profit and loss for entire month
- Includes cost of goods sold and operational expenses
- Sends to admins
- Emits `report.monthly-pl` event
- **Future Improvement**: Departmental P&L breakdown

7. **Quarterly Tax Summary (Quarterly at 11 AM)**
```typescript
@Cron('0 11 1 1,4,7,10 *')
async quarterlyTaxSummary()
```
- Summarizes quarterly financial data for tax compliance
- Groups by tax jurisdiction
- Sends to admins
- Emits `report.tax-summary` event
- **Future Improvement**: Automatic tax document generation

8. **Cleanup Soft-Deleted Records (15th of Month at 3 AM)**
```typescript
@Cron('0 3 15 * *')
async cleanupSoftDeleted()
```
- Permanently deletes soft-deleted records older than 3 months
- Cleans invoices, purchases, and variants
- Improves database performance
- **Future Improvement**: Archival to cold storage before deletion

9. **Check Daily Sales Targets (Every Day at 6 PM)**
```typescript
@Cron('0 18 * * *')
async checkDailySalesTargets()
```
- Compares actual daily sales against target (by branch)
- Alerts if sales < 80% of target
- Emits `alert.sales-target` event
- **Future Improvement**: Predictive alerts if target won't be met based on hourly pace

10. **Employee Performance Summary (Every Monday at 8 AM)**
```typescript
@Cron('0 8 * * 1')
async employeePerformanceSummary()
```
- Calculates cashier performance metrics:
  - Total sales
  - Number of transactions
  - Average order value
- Sends to managers and admins
- Emits `report.employee-performance` event
- **Future Improvement**: Performance bonuses calculation

#### B. **Event-Driven Architecture**

All scheduled tasks emit events that trigger listeners:

```typescript
await this.eventEmitter.emitAsync('inventory.low-stock', {
  variantSku: item.variant.sku,
  productName: item.variant.product.name,
  branchName: item.branch.name,
  currentStock: item.quantity,
  minThreshold: item.minThreshold,
  reorderSuggestion: this.calculateReorderQuantity(item),
});
```

Events are consumed by:
- **NotificationService**: Sends email notifications
- **LoggingService**: Stores events in database
- **AlertService**: Triggers user notifications

### Architecture Pattern

```
Scheduler Service
    ↓
Cron Job Execution
    ↓
Database Query (TypeORM)
    ↓
Event Emission (EventEmitter2)
    ↓
┌──────────────────┬─────────────────┬──────────────────┐
│ Email Service    │ Database Logger  │ Alert Service   │
│ (Nodemailer)     │ (Events Table)   │ (Push/Webhook)  │
└──────────────────┴─────────────────┴──────────────────┘
```

### Performance Considerations

**Current Optimizations:**
- Database query optimization with SelectQueryBuilder and relations
- Batch processing for multiple alerts
- Event-based notification (non-blocking)
- Immutable event data
- Logger integration for debugging

**Database Query Example:**
```typescript
const lowStockItems = await this.inventoryRepo
  .createQueryBuilder('inventory')
  .leftJoinAndSelect('inventory.variant', 'variant')
  .leftJoinAndSelect('variant.product', 'product')
  .leftJoinAndSelect('product.supplier', 'supplier')
  .leftJoinAndSelect('inventory.branch', 'branch')
  .where('inventory.quantity < inventory.minThreshold')
  .getMany();
```

### Future Improvements

#### 1. **Job Queue Integration (BullMQ)**
Currently configured but underutilized. Recommended improvements:

```typescript
// Queue-based processing instead of cron
async checkLowStockAsync() {
  // Add to job queue
  await this.lowStockQueue.add({
    type: 'low-stock-check',
    timestamp: new Date(),
  });
}

// Multiple workers for parallel processing
async processLowStockJob(job) {
  // Distributed processing
  // Retry on failure
  // Progress tracking
}
```

**Benefits:**
- Distribute load across multiple servers
- Retry failed jobs with exponential backoff
- Progress tracking and job history
- Horizontal scalability

#### 2. **Advanced Scheduling Features**

```typescript
// Dynamic cron expressions from database
@Cron('${inventory.check.interval}', {
  name: 'dynamicLowStockCheck',
})

// Per-branch scheduling
async schedulePerBranchCheck() {
  // Schedule unique job for each branch
  // Independent failure handling
}

// Priority-based queue
async prioritizedReorderSuggestions() {
  // High-priority suppliers first
  // Configurable urgency levels
}
```

#### 3. **Monitoring & Alerting**

```typescript
// Track scheduler performance metrics
class SchedulerMetrics {
  trackJobExecution(jobName, duration, status);
  trackJobFailures(jobName, error);
  reportMetrics(); // Send to monitoring service
}

// Implement health checks
@Get('/scheduler/health')
getSchedulerStatus() {
  return {
    lastLowStockCheck: Date,
    lastReportGenerated: Date,
    failedJobs: count,
    queuedTasks: count,
  };
}
```





#### 5. **Notification Enhancements**

```typescript
// Multi-channel notifications
async sendNotification(event) {
  await this.emailService.send(event);      // Email
  await this.smsService.send(event);        // SMS
  await this.pushService.send(event);       // Push notification
  await this.webhookService.send(event);    // Custom webhook
}

// User preference management
async getNotificationPreferences(userId) {
  return {
    lowStockAlerts: { email: true, sms: false, push: true },
    dailyReports: { email: true, sms: false },
    // ... per event type
  };
}
```

#### 6. **Configurable Thresholds**

```typescript
// Dynamic configuration
@Put('/scheduler/config/low-stock-threshold')
updateLowStockThreshold(branchId: string, threshold: number) {
  // Store in database
  // Apply immediately to next run
}

// Branch-specific scheduling
@Post('/scheduler/config/branch-schedules')
configureBranchSchedules(schedules: ScheduleConfig[]) {
  // Different schedules per branch
  // Time-zone aware
}
```

#### 7. **Audit & History**

```typescript
// Track all scheduler actions
class SchedulerAudit {
  recordJobExecution(jobName, status, result);
  recordNotificationSent(eventType, recipients, sentAt);
  getSchedulerHistory(limit);
}

// Scheduler logs API
@Get('/scheduler/logs')
getSchedulerLogs(
  @Query('startDate') start: Date,
  @Query('endDate') end: Date,
  @Query('jobType') type: string,
) {
  // Query audit logs
  // Filter by date range and job type
}
```

#### 8. **Resilience & Fault Tolerance**

```typescript
// Implement circuit breaker pattern
async checkLowStockWithRetry() {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await this.checkLowStock();
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
  }
  // Alert ops team if all retries fail
  await this.alertOps('checkLowStock failed after retries');
}

// Graceful degradation
async fallbackNotification(event) {
  // Store in database if email fails
  // Retry later with manual verification
}
```

#### 9. **Performance Optimization**

```typescript
// Batch processing with chunking
async checkLowStockBatch(chunkSize = 1000) {
  const count = await this.inventoryRepo.count();
  for (let i = 0; i < count; i += chunkSize) {
    const items = await this.inventoryRepo.find({
      skip: i,
      take: chunkSize,
    });
    // Process chunk
  }
}

// Index optimization
// Ensure indexes on:
// - inventory.quantity
// - inventory.minThreshold
// - invoice.createdAt
// - user.branch
```

#### 10. **Webhook Integration**

```typescript
// Allow external systems to hook into scheduler events
@Post('/webhooks/subscribe')
subscribeToEvent(
  @Body() config: WebhookConfig
) {
  // Register webhook URL
  // Event type filter
  // Retry policy
}

// Emit webhooks on scheduler events
private async emitWebhook(event) {
  for (const webhook of this.webhooks) {
    if (webhook.events.includes(event.type)) {
      await this.httpClient.post(webhook.url, event);
    }
  }
}
```

### Recommended Implementation Priority

1. **High Priority (Week 1):**
   - Job Queue integration for distributed processing
   - Monitoring and health checks
   - Audit logging

2. **Medium Priority (Week 2-3):**
   - Configurable thresholds and schedules
   - Enhanced notifications (SMS, push, webhooks)
   - Resilience patterns (retries, circuit breaker)

3. **Low Priority (Month 2+):**
   - Machine learning integration
   - Advanced performance optimization
   - Complex webhook systems

### Testing Recommendations

```typescript
// Unit tests for cron functions
describe('SchedulerService', () => {
  it('should detect low stock items', async () => {
    const lowStockItems = await scheduler.checkLowStock();
    expect(lowStockItems.length).toBeGreaterThan(0);
  });

  it('should emit inventory.low-stock event', async () => {
    const spy = jest.spyOn(eventEmitter, 'emitAsync');
    await scheduler.checkLowStock();
    expect(spy).toHaveBeenCalledWith('inventory.low-stock', expect.any(Object));
  });

  it('should handle database errors gracefully', async () => {
    jest.spyOn(inventoryRepo, 'find').mockRejectedValue(new Error('DB Error'));
    const result = await scheduler.checkLowStock();
    expect(logger.error).toHaveBeenCalled();
  });
});
```

---

## Summary

This Inventory Management System is a production-ready, enterprise-scale backend application built with modern NestJS architecture. It provides comprehensive inventory management, financial reporting, and automated scheduling capabilities suitable for multi-branch retail operations.

The modular architecture, event-driven design, and extensive scheduling capabilities enable scalable business operations with minimal manual intervention. The recommended future improvements will further enhance system resilience, scalability, and user experience.

For questions or contributions, please refer to the Swagger documentation at `/api/docs` or contact the development team.

