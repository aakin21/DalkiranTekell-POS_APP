import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from './store.entity';
import { User } from './user.entity';
import { Device } from './device.entity';

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  device_id: string;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  opening_cash: number; // Başlangıç nakit

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  closing_cash: number; // Kapanış nakit

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  expected_cash: number; // Sistem hesapladığı olması gereken nakit

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cash_difference: number; // Fark (closing_cash - expected_cash)

  @Column({ type: 'datetime' })
  opened_at: Date;

  @Column({ type: 'datetime', nullable: true })
  closed_at: Date;

  @Column({ default: true })
  is_open: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
