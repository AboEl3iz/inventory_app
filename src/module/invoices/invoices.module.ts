import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { InvoiceItem } from './entities/invoice_items.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService],
  imports: [
    InventoryModule,
    TypeOrmModule.forFeature([
      InvoiceItem , ProductVariant,Invoice,Branch
    ]),
  ],
})
export class InvoicesModule {}
