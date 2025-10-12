import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/entities/base.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { User } from 'src/module/users/entities/user.entity';

@Entity('branches')
export class Branch extends BaseEntity {
  @Column()
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

