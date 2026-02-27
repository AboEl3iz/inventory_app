import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity'; import { Product } from '../../products/entities/product.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { ProductVariant } from 'src/module/products/entities/product-variant.entity';

@Entity('inventory')
@Unique(['variant', 'branch'])
@Index('IDX_inventory_branch', ['branch'])
@Index('IDX_inventory_variant', ['variant'])
export class Inventory extends BaseEntity {
  @ManyToOne(() => ProductVariant, variant => variant.inventories)
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  @ManyToOne(() => Branch, branch => branch.inventories)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  minThreshold: number;

  @Column({ default: false })
  lowStockAlertSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastAlertSentAt: Date;
}
