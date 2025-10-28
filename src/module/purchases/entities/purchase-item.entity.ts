import { ProductVariant } from "src/module/products/entities/product-variant.entity";
import { Entity, ManyToOne, Column, JoinColumn } from "typeorm";
import { Purchase } from "./purchase.entity";
import { BaseEntity } from "src/entities/base.entity";

@Entity('purchase_items')
export class PurchaseItem extends BaseEntity {
  @ManyToOne(() => Purchase, purchase => purchase.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseId' })
  purchase: Purchase;

  @ManyToOne(() => ProductVariant, variant => variant.purchaseItems, { eager: true })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;
}
