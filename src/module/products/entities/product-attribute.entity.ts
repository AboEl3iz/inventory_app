import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';import { Category } from '../../categories/entities/category.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';

@Entity('product_attributes')
export class ProductAttribute extends BaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => ProductAttributeValue, (value) => value.attribute)
  values: ProductAttributeValue[];
}
