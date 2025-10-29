import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';import { Product } from './product.entity';
import { ProductVariantValue } from './product-variant-value.entity';
import { Inventory } from 'src/module/inventory/entities/inventory.entity';
import { InvoiceItem } from 'src/module/invoices/entities/invoice_items.entity';
import { PurchaseItem } from 'src/module/purchases/entities/purchase-item.entity';
import { StockMovement } from 'src/module/stock/entities/stock.entity';

@Entity('product_variants')
@Index(['sku'], { unique: true })
export class ProductVariant extends BaseEntity {
  @Column({ unique: true })
  sku: string;

  @Column({ nullable: true, unique: true })
  barcode?: string;

  // 💰 price → Selling price (سعر البيع للعميل)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  // 🧾 costPrice → Latest purchase cost (آخر تكلفة شراء تم تسجيلها)
  // يستخدم لتقدير تكلفة المنتج في التقارير والـ profit margin
  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2 })
  costPrice: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Product, product => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @OneToMany(() => ProductVariantValue, value => value.variant, { cascade: true })
  values: ProductVariantValue[];

  @OneToMany(() => Inventory, inventory => inventory.variant)
  inventories: Inventory[];

  @OneToMany(() => InvoiceItem, item => item.variant)
  invoiceItems: InvoiceItem[];

  @OneToMany(() => PurchaseItem, item => item.variant)
  purchaseItems: PurchaseItem[];

  @OneToMany(() => StockMovement, movement => movement.variant)
  stockMovements: StockMovement[];
}
