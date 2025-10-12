import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('invoices')
export class Invoice extends BaseEntity {
  @ManyToOne(() => User, user => user.invoices)
  user: User;

  @ManyToOne(() => Branch, branch => branch.id)
  branch: Branch;

  @Column({ type: 'float' })
  totalAmount: number;

  @Column({ default: 'paid' })
  status: string;
}
