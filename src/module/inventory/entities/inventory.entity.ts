import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('inventory')
export class Inventory extends BaseEntity {
  @ManyToOne(() => Product)
  product: Product;

  @ManyToOne(() => Branch)
  branch: Branch;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  minThreshold: number;
}
