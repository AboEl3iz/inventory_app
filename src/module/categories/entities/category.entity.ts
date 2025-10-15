import { Entity, Column, OneToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';import { Product } from '../../products/entities/product.entity';
import { ProductAttribute } from '../../products/entities/product-attribute.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => Category, category => category.children, { nullable: true })
  parent?: Category;

  @OneToMany(() => Category, category => category.parent)
  children: Category[];

  @OneToMany(() => ProductAttribute, product => product.category)
  products: Product[];
}
