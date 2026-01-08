import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { Store } from '../../entities/store.entity';
import { Device } from '../../entities/device.entity';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Payment } from '../../entities/payment.entity';
import { Refund } from '../../entities/refund.entity';
import { StockAdjustment } from '../../entities/stock-adjustment.entity';
import { Shift } from '../../entities/shift.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      User,
      Store,
      Device,
      Sale,
      SaleItem,
      Payment,
      Refund,
      StockAdjustment,
      Shift,
      AuditLog,
    ]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
