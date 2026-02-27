import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { User } from '../../users/entities/user.entity';
import { Invoice } from 'src/module/invoices/entities/invoice.entity';
import { Purchase } from 'src/module/purchases/entities/purchase.entity';
import { StockMovement } from 'src/module/stock/entities/stock.entity';

@Entity('branches')
export class Branch extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column()
  address: string;

  @Column()
  phone: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.branch)
  users: User[];

  @OneToMany(() => Inventory, (inventory) => inventory.branch)
  inventories: Inventory[];

  @OneToMany(() => Invoice, (invoice) => invoice.branch)
  invoices: Invoice[];

  @OneToMany(() => Purchase, (purchase) => purchase.branch)
  purchases: Purchase[];

  @OneToMany(() => StockMovement, (movement) => movement.branch)
  stockMovements: StockMovement[];
}
