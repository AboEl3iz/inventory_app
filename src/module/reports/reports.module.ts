import { Module } from '@nestjs/common';
import { ReportService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from '../stock/entities/stock.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice_items.entity';

@Module({
  controllers: [ReportsController],
  providers: [ReportService],
  exports: [ReportService],
  imports: [
    TypeOrmModule.forFeature([Purchase, Invoice, InvoiceItem, StockMovement]),
  ],
})
export class ReportsModule {}
