import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from './store.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  activation_code: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @ManyToOne(() => Store, store => store.devices)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ default: false })
  is_activated: boolean;

  @Column({ type: 'datetime', nullable: true })
  activated_at: Date;

  @Column({ type: 'datetime', nullable: true })
  last_sync_at: Date;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
