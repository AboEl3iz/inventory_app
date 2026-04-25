import { ProductVariant } from 'src/module/products/entities/product-variant.entity';
import { Entity, ManyToOne, Column, JoinColumn } from 'typeorm';
import { Purchase } from './purchase.entity';
import { BaseEntity } from 'src/entities/base.entity';

@Entity('purchase_items')
export class PurchaseItem extends BaseEntity {
  @ManyToOne(() => Purchase, (purchase) => purchase.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchaseId' })
  purchase: Purchase;

  @ManyToOne(() => ProductVariant, (variant) => variant.purchaseItems, {
    eager: true,
  })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  @Column({ type: 'int' })
  quantity: number;

  // 🧮 unitCost → Actual purchase price per unit in this invoice
  // (السعر الفعلي اللي اشترينا بيه المنتج في الفاتورة الحالية)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitCost: number;

  // 📦 subtotal → quantity × unitCost (إجمالي سعر هذا البند)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;
}
