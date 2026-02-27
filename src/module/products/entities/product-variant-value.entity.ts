import { Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';

@Entity('product_variant_values')
export class ProductVariantValue extends BaseEntity {
  @ManyToOne(() => ProductVariant, (variant) => variant.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  @ManyToOne(() => ProductAttributeValue, (value) => value.variantValues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attributeValueId' })
  attributeValue: ProductAttributeValue;
}
