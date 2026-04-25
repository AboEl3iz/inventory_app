import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmconfig } from './config/typeorm.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';

// ─── Shared Modules ───
import { StorageModule } from './shared/storage/storage.module';
import {
  PURCHASES_QUEUE,
  INVOICES_QUEUE,
  LOW_STOCK_QUEUE,
  EMAIL_QUEUE,
  SCHEDULER_QUEUE,
} from './shared/event.constants';

// ─── Feature Modules ───
import { ProductsModule } from './module/products/products.module';
import { BranchesModule } from './module/branches/branches.module';
import { EventsModule } from './module/events/events.module';
import { StockModule } from './module/stock/stock.module';
import { SuppliersModule } from './module/suppliers/suppliers.module';
import { ReportsModule } from './module/reports/reports.module';
import { InvoicesModule } from './module/invoices/invoices.module';
import { PurchasesModule } from './module/purchases/purchases.module';
import { AnalyticsModule } from './module/analytics/analytics.module';
import { AuthModule } from './module/auth/auth.module';
import { UsersModule } from './module/users/users.module';
import { CategoriesModule } from './module/categories/categories.module';
import { InventoryModule } from './module/inventory/inventory.module';
import { MetricsModule } from './module/metrics/metrics.module';

// ─── Mode-specific modules ───
import { SchedulerModule } from './module/scheduler/scheduler.module';
import { JobsModule } from './module/jobs/jobs.module';

// ─── Logging ───
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

/**
 * START_MODE controls which role this pod plays:
 *
 *  - "api"       → HTTP server only. No queue workers, no cron scheduling.
 *  - "worker"    → Processes jobs from Redis queues (BullMQ @Processor).
 *                  No HTTP routes, no scheduling.
 *  - "scheduler" → Registers BullMQ repeatable jobs in Redis at startup.
 *                  No HTTP routes (except a health port), no workers.
 *
 * This prevents any duplicate cron execution across replicas.
 */
const START_MODE = process.env.START_MODE || 'api';

const isApi = START_MODE === 'api';
const isWorker = START_MODE === 'worker';
const isScheduler = START_MODE === 'scheduler';

@Module({
  imports: [
    // ─── Global Config ───
    ConfigModule.forRoot({ isGlobal: true }),

    // ─── Logging (single source of truth) ───
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          level: 'debug',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    }),

    // ─── Queue (BullMQ / Redis) — always registered so producers and
    //     consumers can reference queues regardless of mode ───
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: { count: 50 },
          removeOnFail: { count: 100 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: PURCHASES_QUEUE },
      { name: INVOICES_QUEUE },
      { name: LOW_STOCK_QUEUE },
      { name: EMAIL_QUEUE },
      { name: SCHEDULER_QUEUE },
    ),

    // ─── Storage (Cloudinary / S3) ───
    StorageModule,

    // ─── Events ───
    EventEmitterModule.forRoot(),

    // ─── Cache ───
    CacheModule.register({ ttl: 300, isGlobal: true }),

    // ─── Database ───
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        typeOrmconfig(configService),
      inject: [ConfigService],
    }),

    // ─── API-only modules (HTTP controllers, Multer, Auth, etc.) ────────────
    // ⚠️  Never load these in worker/scheduler mode.
    //     ProductsModule creates Multer DiskStorage at module-init time which
    //     calls mkdirSync — this crashes when readOnlyRootFilesystem=true.
    ...(isApi
      ? [
          ProductsModule,   // ← has Multer DiskStorage — API only
          BranchesModule,
          StockModule,
          SuppliersModule,
          InvoicesModule,
          PurchasesModule,
          AnalyticsModule,
          AuthModule,
          UsersModule,
          CategoriesModule,
          MetricsModule,
        ]
      : []),

    // ─── Shared DB modules needed by both API and Worker ─────────────────────
    // InventoryModule and ReportsModule are imported by EventsModule / JobsModule
    // but also needed explicitly so their services are resolvable in the DI tree.
    ...(isApi || isWorker
      ? [
          InventoryModule,  // ← required by EventsModule (InvoicesListener)
          ReportsModule,    // ← required by JobsModule processors
        ]
      : []),

    // ─── Worker queue processors (BullMQ listeners) ───────────────────────────
    // EventsModule: handles INVOICES_QUEUE, PURCHASES_QUEUE, LOW_STOCK_QUEUE,
    //               EMAIL_QUEUE processors (InvoicesListener, etc.)
    // JobsModule:   handles SCHEDULER_QUEUE processors (reports, cleanup, etc.)
    ...(isWorker ? [EventsModule, JobsModule] : []),

    // ─── Scheduler: registers repeatable jobs in Redis once at startup ────────
    ...(isScheduler ? [SchedulerModule] : []),

    // ─── API: load EventsModule for event-emitter listeners on API pods ───────
    ...(isApi ? [EventsModule] : []),
  ],
  controllers: [...(isApi ? [AppController] : [])],
  providers: [...(isApi ? [AppService] : [])],
})
export class AppModule {}
