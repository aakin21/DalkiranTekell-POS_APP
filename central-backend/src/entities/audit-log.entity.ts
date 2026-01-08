import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Store } from './store.entity';
import { Device } from './device.entity';

export enum AuditAction {
  LOGIN = 'login',
  SALE = 'sale',
  REFUND = 'refund',
  STOCK_ADJUSTMENT = 'stock_adjustment',
  PRICE_CHANGE = 'price_change',
  SHIFT_OPEN = 'shift_open',
  SHIFT_CLOSE = 'shift_close',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  PRODUCT_CREATE = 'product_create',
  PRODUCT_UPDATE = 'product_update',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: AuditAction,
  })
  action_type: AuditAction;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  store_id: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'uuid', nullable: true })
  device_id: string;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ type: 'uuid', nullable: true })
  entity_id: string; // Sale ID, Product ID, etc.

  @Column({ type: 'simple-json', nullable: true })
  metadata: any; // Ek bilgiler (JSON)

  @Column({ type: 'text', nullable: true })
  ip_address: string;

  @CreateDateColumn()
  created_at: Date;
}
