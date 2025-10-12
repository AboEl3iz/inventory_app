import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('stock')
export class Stock extends BaseEntity {
  @ManyToOne(() => Branch)
  branch: Branch;

  @ManyToOne(() => Product)
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ default: 'IN' })
  type: string;
}
