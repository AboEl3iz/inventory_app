import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmconfig } from './config/typeorm.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

// ─── Shared Modules ───
import { StorageModule } from './shared/storage/storage.module';
import {
  PURCHASES_QUEUE,
  INVOICES_QUEUE,
  LOW_STOCK_QUEUE,
  EMAIL_QUEUE,
} from './shared/event.constants';

// ─── Feature Modules ───
import { ProductsModule } from './module/products/products.module';
import { BranchesModule } from './module/branches/branches.module';
import { EventsModule } from './module/events/events.module';
import { StockModule } from './module/stock/stock.module';
import { SuppliersModule } from './module/suppliers/suppliers.module';
import { SchedulerModule } from './module/scheduler/scheduler.module';
import { ReportsModule } from './module/reports/reports.module';
import { InvoicesModule } from './module/invoices/invoices.module';
import { PurchasesModule } from './module/purchases/purchases.module';
import { AnalyticsModule } from './module/analytics/analytics.module';
import { AuthModule } from './module/auth/auth.module';
import { UsersModule } from './module/users/users.module';
import { CategoriesModule } from './module/categories/categories.module';
import { InventoryModule } from './module/inventory/inventory.module';
import { MetricsModule } from './module/metrics/metrics.module';

// ─── Logging ───
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

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

    // ─── Queue (BullMQ / Redis) ───
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: PURCHASES_QUEUE },
      { name: INVOICES_QUEUE },
      { name: LOW_STOCK_QUEUE },
      { name: EMAIL_QUEUE },
    ),

    // ─── Storage (Cloudinary / S3) ───
    StorageModule,

    // ─── Events ───
    EventEmitterModule.forRoot(),

    // ─── Scheduler ───
    ScheduleModule.forRoot(),

    // ─── Cache ───
    CacheModule.register({ ttl: 300, isGlobal: true }),

    // ─── Database ───
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        typeOrmconfig(configService),
      inject: [ConfigService],
    }),

    // ─── Feature Modules ───
    ProductsModule,
    BranchesModule,
    EventsModule,
    StockModule,
    SuppliersModule,
    SchedulerModule,
    ReportsModule,
    InvoicesModule,
    PurchasesModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    InventoryModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
