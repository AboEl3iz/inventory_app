import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { InvoiceItem } from './invoice_items.entity';

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Column({ unique: true })
  invoiceNumber: string;

  @ManyToOne(() => User, user => user.invoices)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  CustomerEmail: string;

  @Column({ nullable: true })
  CustomerName: string;

  @ManyToOne(() => Branch, branch => branch.invoices)
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
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';

  @Column({ nullable: true })
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit';

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => InvoiceItem, item => item.invoice, { cascade: true })
  items: InvoiceItem[];
}


