import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { Store } from './store.entity';
import { User } from './user.entity';

export enum AdjustmentType {
  ADD = 'add',
  REMOVE = 'remove',
  SET = 'set', // Direkt belirli bir değere ayarla
}

@Entity('stock_adjustments')
export class StockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid' })
  store_id: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({
    type: 'simple-enum',
    enum: AdjustmentType,
  })
  adjustment_type: AdjustmentType;

  @Column({ type: 'int' })
  quantity: number; // Miktar

  @Column({ type: 'int' })
  old_stock: number; // Önceki stok

  @Column({ type: 'int' })
  new_stock: number; // Yeni stok

  @Column({ type: 'text' })
  reason: string; // Sebep (zorunlu)

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
