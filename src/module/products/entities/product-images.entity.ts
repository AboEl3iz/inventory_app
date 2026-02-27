import { Entity, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Product } from './product.entity';
import { BaseEntity } from 'src/entities/base.entity';

@Entity('product_images')
export class ProductImage extends BaseEntity {
  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  url: string;

  @Column()
  public_Id: string;
}
