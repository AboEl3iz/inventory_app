import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductVariant } from 'src/module/products/entities/product-variant.entity';
import { User } from 'src/module/users/entities/user.entity';

@Entity('stock_movements')
@Index('IDX_stock_movement_branch', ['branch'])
@Index('IDX_stock_movement_variant', ['variant'])
@Index('IDX_stock_movement_type', ['type'])
@Index('IDX_stock_movement_created', ['createdAt'])
export class StockMovement extends BaseEntity {
  @ManyToOne(() => ProductVariant, variant => variant.stockMovements)
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  @ManyToOne(() => Branch, branch => branch.stockMovements)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer' | 'damage';

  @Column({ type: 'int' })
  quantityChange: number;

  @Column({ type: 'int' })
  quantityBefore: number;

  @Column({ type: 'int' })
  quantityAfter: number;

  @Column({ nullable: true })
  referenceType: string; // 'invoice', 'purchase', 'manual'

  @Column({ nullable: true })
  referenceId: string;

  @ManyToOne(() => User, user => user.stockMovements)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text', nullable: true })
  notes: string;
}