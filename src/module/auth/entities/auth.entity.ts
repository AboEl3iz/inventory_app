import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../entities/base.entity';import { User } from '../../users/entities/user.entity';
import { join } from 'path';

@Entity('auth')
export class Auth extends BaseEntity {
  @OneToOne(() => User ,{onDelete: 'CASCADE'})
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  refreshToken: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  expiresAt: Date;
}
