import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('purchases')
export class Purchase extends BaseEntity {
  @ManyToOne(() => Supplier, supplier => supplier.purchases)
  supplier: Supplier;

  @ManyToOne(() => User, user => user.purchases)
  user: User;

  @ManyToOne(() => Branch, branch => branch.id)
  branch: Branch;

  @Column({ type: 'float' })
  totalAmount: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'canceled';
}
