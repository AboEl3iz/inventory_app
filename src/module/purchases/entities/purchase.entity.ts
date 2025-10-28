import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { ProductVariant } from 'src/module/products/entities/product-variant.entity';
import { PurchaseItem } from './purchase-item.entity';

@Entity('purchases')
export class Purchase extends BaseEntity {
  @Column({ unique: true })
  purchaseNumber: string;

  @ManyToOne(() => Supplier, supplier => supplier.purchases)
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @ManyToOne(() => User, user => user.purchases)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Branch, branch => branch.purchases)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'cancelled';

  @Column({ type: 'timestamp', nullable: true })
  receivedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => PurchaseItem, item => item.purchase, { cascade: true })
  items: PurchaseItem[];
}


