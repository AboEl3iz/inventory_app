import { Entity, Column, OneToMany, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';import { Invoice } from '../../invoices/entities/invoice.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { Auth } from '../../auth/entities/auth.entity';
import { StockMovement } from 'src/module/stock/entities/stock.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToOne(() => Auth, auth => auth.user, { cascade: true })
  auth: Auth;

  @ManyToOne(() => Branch, branch => branch.users)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ default: 'admin' })
  role: 'admin' | 'manager' | 'cashier';

  @OneToMany(() => Invoice, invoice => invoice.user)
  invoices: Invoice[];

  @OneToMany(() => Purchase, purchase => purchase.user)
  purchases: Purchase[];

  @OneToMany(() => StockMovement, movement => movement.user)
  stockMovements: StockMovement[];
}
