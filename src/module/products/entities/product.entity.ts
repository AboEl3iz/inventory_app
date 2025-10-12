import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';
import { Category } from '../../categories/entities/category.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  brand: string;

  @Column({ name: 'base_price', type: 'float' })
  basePrice: number;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Supplier, (supplier) => supplier.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @OneToMany(() => ProductAttributeValue, (value) => value.product)
  attributeValues: ProductAttributeValue[];
}
