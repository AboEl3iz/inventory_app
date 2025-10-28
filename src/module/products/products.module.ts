import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Product } from './entities/product.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductAttributeValue } from './entities/product-attribute-value.entity';
import { ProductVariantValue } from './entities/product-variant-value.entity';
import { ProductImage } from './entities/product-images.entity';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [
    CacheModule.register({
      ttl: 60 * 5, // cache duration: 5 minutes
    }),
    TypeOrmModule.forFeature([Product ,Supplier, ProductVariantValue ,ProductAttributeValue,ProductAttribute,ProductVariant,Category,Supplier , ProductImage]),
  ],
})
export class ProductsModule { }
