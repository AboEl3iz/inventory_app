import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';

@Entity('suppliers')
export class Supplier extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column()
  contactPerson: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Product, (product) => product.supplier)
  products: Product[];

  @OneToMany(() => Purchase, (purchase) => purchase.supplier)
  purchases: Purchase[];
}
