import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';

import { SCHEDULER_QUEUE } from '../../shared/event.constants';

// ─── Entities ───────────────────────────────────────────────────────────────
import { Inventory } from '../inventory/entities/inventory.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';

// ─── Processors ─────────────────────────────────────────────────────────────
import { LowStockCheckProcessor } from './processors/low-stock-check.processor';
import { ResetLowStockAlertsProcessor } from './processors/reset-low-stock-alerts.processor';
import { GenerateReorderSuggestionsProcessor } from './processors/generate-reorder-suggestions.processor';
import { DailySalesReportProcessor } from './processors/daily-sales-report.processor';
import { WeeklyRevenueReportProcessor } from './processors/weekly-revenue-report.processor';
import { MonthlyPlReportProcessor } from './processors/monthly-pl-report.processor';
import { QuarterlyTaxSummaryProcessor } from './processors/quarterly-tax-summary.processor';
import { CleanupSoftDeletedProcessor } from './processors/cleanup-soft-deleted.processor';
import { DailySalesTargetsProcessor } from './processors/daily-sales-targets.processor';
import { EmployeePerformanceProcessor } from './processors/employee-performance.processor';
import { ShrinkageTrackingProcessor } from './processors/shrinkage-tracking.processor';

// ─── Sibling modules ─────────────────────────────────────────────────────────
import { ReportsModule } from '../reports/reports.module';

/**
 * JobsModule — loaded exclusively on Worker pods (START_MODE=worker).
 *
 * Contains all @Processor classes that consume jobs from SCHEDULER_QUEUE.
 * Each processor handles exactly one job type (Single Responsibility).
 * Business logic lives here; the scheduler pod only enqueues.
 */
@Module({
  imports: [
    WinstonModule,
    ReportsModule,
    BullModule.registerQueue({ name: SCHEDULER_QUEUE }),
    TypeOrmModule.forFeature([
      Inventory,
      Invoice,
      Purchase,
      ProductVariant,
      StockMovement,
      Branch,
      User,
    ]),
  ],
  providers: [
    LowStockCheckProcessor,
    ResetLowStockAlertsProcessor,
    GenerateReorderSuggestionsProcessor,
    DailySalesReportProcessor,
    WeeklyRevenueReportProcessor,
    MonthlyPlReportProcessor,
    QuarterlyTaxSummaryProcessor,
    CleanupSoftDeletedProcessor,
    DailySalesTargetsProcessor,
    EmployeePerformanceProcessor,
    ShrinkageTrackingProcessor,
  ],
})
export class JobsModule {}
