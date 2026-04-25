import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Inventory } from './entities/inventory.entity';
import { StockMovement } from '../stock/entities/stock.entity';

/**
 * InventoryController uses AuthenticationGuard which depends on JwtService.
 * JwtService is only available when AuthModule is loaded (API mode only).
 *
 * In worker/scheduler mode we still need InventoryService (used by
 * StockListener, InvoicesListener, etc.) but NOT the HTTP controller.
 * Gating the controller here makes InventoryModule safe to import in any mode.
 */
const isApiMode = (process.env.START_MODE || 'api') === 'api';

@Module({
  controllers: [...(isApiMode ? [InventoryController] : [])],
  providers: [InventoryService],
  imports: [
    TypeOrmModule.forFeature([Inventory, ProductVariant, Branch, StockMovement]),
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
