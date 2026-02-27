import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from './entities/purchase.entity';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [PurchasesController],
  providers: [PurchasesService],
  imports: [
    TypeOrmModule.forFeature([
      Purchase,
      ProductVariant,
      Branch,
      User,
      Supplier,
    ]),
    BullModule.registerQueue({ name: 'PURCHASES_QUEUE' }),
  ],
})
export class PurchasesModule {}
