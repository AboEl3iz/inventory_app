import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';import { Product } from './product.entity';
import { ProductVariantValue } from './product-variant-value.entity';

@Entity('product_variants')
export class ProductVariant extends BaseEntity {
  @Column()
  sku: string;

  @Column({ nullable: true })
  barcode?: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  price: number;

  @Column({ name: 'cost_price', type: 'decimal', precision: 8, scale: 2 })
  costPrice: number;

  @Column({ name: 'stock_quantity', type: 'smallint' })
  stockQuantity: number;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => ProductVariantValue, (value) => value.variant)
  values: ProductVariantValue[];
}
