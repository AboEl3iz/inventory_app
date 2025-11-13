import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Category } from '../categories/entities/category.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice_items.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { StockMovement } from '../stock/entities/stock.entity';
import { User } from '../users/entities/user.entity';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  imports:[
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Purchase,
      Inventory,
      StockMovement,
      ProductVariant,
      Product,
      Category,
      Branch,
      User
    ])
  ]
})
export class AnalyticsModule {}
