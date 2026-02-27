import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Product } from '../products/entities/product.entity';
import { Purchase } from '../purchases/entities/purchase.entity';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService],
  imports: [
    TypeOrmModule.forFeature([Supplier, Inventory, Purchase, Branch, Product]),
  ],
})
export class SuppliersModule {}
