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

@Module({
  controllers: [EventsController],
  providers: [
    EventsService,
    StockListener,
    PuchaseListener,
    InvoicesListener,
    EmailProcessor,
  ],
  imports: [
    WinstonModule,
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
