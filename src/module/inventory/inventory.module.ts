import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Inventory } from './entities/inventory.entity';
import { StockMovement } from '../stock/entities/stock.entity';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      ProductVariant,
      Branch,
      StockMovement,
    ]),
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
