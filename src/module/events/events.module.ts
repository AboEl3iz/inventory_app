import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { StockListener } from './listener/stock.listener';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InventoryModule } from '../inventory/inventory.module';
import { WinstonModule } from 'nest-winston/dist/winston.module';

@Module({
  controllers: [EventsController],
  providers: [EventsService , StockListener],
  imports: [
    WinstonModule,
    EventEmitterModule.forRoot(),
    InventoryModule
  ],
})
export class EventsModule {}
