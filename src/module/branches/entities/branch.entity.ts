import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';import { Inventory } from '../../inventory/entities/inventory.entity';
import { User } from '../../users/entities/user.entity';

@Entity('branches')
export class Branch extends BaseEntity {
  @Column({unique: true })
  name: string;

  @Column()
  address: string;

  @Column()
  phone: string;
  @OneToMany(() => User, user => user.branch)
  users : User[];

  @OneToMany(() => Inventory, inventory => inventory.branch)
  inventories: Inventory[];
}

