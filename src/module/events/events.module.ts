import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { StockListener } from './listener/stock.listener';
import { InventoryModule } from '../inventory/inventory.module';
import { WinstonModule } from 'nest-winston';
import { PuchaseListener } from './listener/purchase.listener';
import { InvoicesListener } from './listener/invoices.listener';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { EmailProcessor } from './listener/sendEmail.listener';
import { Event } from './entities/event.entity';
import {
  PURCHASES_QUEUE,
  INVOICES_QUEUE,
  LOW_STOCK_QUEUE,
  EMAIL_QUEUE,
} from '../../shared/event.constants';

const isWorkerMode = process.env.START_MODE === 'worker';

/**
 * EventsModule has two distinct roles depending on START_MODE:
 *
 *  API mode   → registers EventsController (HTTP routes) + InventoryModule
 *               (needed by EventsController/EventsService for auth context).
 *               Does NOT register queue listeners (workers handle those).
 *
 *  Worker mode → registers queue listeners (StockListener, InvoicesListener,
 *                etc.) WITHOUT any HTTP controller or InventoryModule.
 *                InventoryModule must NOT be loaded in worker mode because
 *                its InventoryController uses AuthenticationGuard → JwtService,
 *                which is only available when AuthModule is loaded (API only).
 */
@Module({
  // ─── Controllers: API only ────────────────────────────────────────────────
  // EventsController uses AuthenticationGuard → JwtService (from AuthModule).
  // AuthModule is only loaded in API mode, so this guard crashes in worker mode.
  controllers: [...(!isWorkerMode ? [EventsController] : [])],

  providers: [
    EventsService,
    // ─── Queue listeners: Worker only ───────────────────────────────────────
    // These @Processor classes consume from BullMQ queues.
    // They must NOT run on API pods (only workers process jobs).
    ...(isWorkerMode
      ? [StockListener, PuchaseListener, InvoicesListener, EmailProcessor]
      : []),
  ],

  imports: [
    WinstonModule,
    // InventoryModule now gates its own controller (API mode only),
    // so it is safe to import in all modes. Workers get InventoryService
    // here for StockListener, InvoicesListener, etc.
    InventoryModule,
    TypeOrmModule.forFeature([Event, ProductVariant]),
    BullModule.registerQueue({ name: PURCHASES_QUEUE }),
    BullModule.registerQueue({ name: INVOICES_QUEUE }),
    BullModule.registerQueue({ name: LOW_STOCK_QUEUE }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  exports: [EventsService],
})
export class EventsModule {}
