import { Module } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Invoice } from '../invoices/entities/invoice.entity';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService],
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      ProductVariant,
      Product,
      Inventory,
      User,
      Invoice,
    ]),
  ],
})
export class BranchesModule {}
