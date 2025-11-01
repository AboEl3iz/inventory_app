import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { StockListener } from './listener/stock.listener';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InventoryModule } from '../inventory/inventory.module';
import { WinstonModule } from 'nest-winston';
import { PuchaseListener } from './listener/purchase.listener';
import { InvoicesListener } from './listener/invoices.listener';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';

@Module({
  controllers: [EventsController],
  providers: [EventsService , StockListener , PuchaseListener , InvoicesListener],
  imports: [
    WinstonModule,
    EventEmitterModule.forRoot(),
    InventoryModule,
    TypeOrmModule.forFeature([
      ProductVariant
    ]),
    BullModule.registerQueue({ name: "LOW_STOCK_QUEUE" } , { name: "PURCHASES_QUEUE" } , { name: "INVOICES_QUEUE" }),
  ],
})
export class EventsModule {}
