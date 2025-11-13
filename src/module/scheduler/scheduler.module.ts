import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { NotificationService } from './notification.service';
import { WinstonModule } from 'nest-winston';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { User } from '../users/entities/user.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ReportsModule } from '../reports/reports.module';
import { BullModule, BullRegistrar } from '@nestjs/bullmq';

@Module({
  controllers: [SchedulerController],
  providers: [SchedulerService,NotificationService],
  imports: [
  BullModule.registerQueue({ name: 'EMAIL_QUEUE' }),
    ReportsModule,
        WinstonModule,
        ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([
      Inventory,
      StockMovement,
      Invoice,
      Purchase,
      ProductVariant,
      Branch,
      User,
      
    ])
  ],
})
export class SchedulerModule {}
