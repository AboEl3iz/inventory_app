import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';
import { Product } from './product.entity';
import { ProductAttribute } from './product-attribute.entity';
import { ProductVariantValue } from './product-variant-value.entity';

@Entity('product_attribute_values')
export class ProductAttributeValue extends BaseEntity {
  @Column()
  value: string;

  @ManyToOne(() => ProductAttribute, (attr) => attr.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attribute_id' })
  attribute: ProductAttribute;

  @ManyToOne(() => Product, (product) => product.attributeValues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => ProductVariantValue, (vv) => vv.attributeValue)
  variantValues: ProductVariantValue[];
}
