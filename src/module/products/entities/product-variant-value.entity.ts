import {
  Entity,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';

@Entity('product_variant_values')
export class ProductVariantValue extends BaseEntity {
  @ManyToOne(() => ProductVariant, (variant) => variant.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @ManyToOne(() => ProductAttributeValue, (value) => value.variantValues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attribute_value_id' })
  attributeValue: ProductAttributeValue;
}
