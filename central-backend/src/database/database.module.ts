import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Store } from '../entities/store.entity';
import { Device } from '../entities/device.entity';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { PriceHistory } from '../entities/price-history.entity';
import { User } from '../entities/user.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { Payment } from '../entities/payment.entity';
import { Refund } from '../entities/refund.entity';
import { Shift } from '../entities/shift.entity';
import { Stock } from '../entities/stock.entity';
import { StockAdjustment } from '../entities/stock-adjustment.entity';
import { AuditLog } from '../entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'better-sqlite3',
        database: 'dalkiran.db',
        entities: [
          Store,
          Device,
          Category,
          Product,
          PriceHistory,
          User,
          Sale,
          SaleItem,
          Payment,
          Refund,
          Shift,
          Stock,
          StockAdjustment,
          AuditLog,
        ],
        synchronize: true, // Development only! Use migrations in production
        logging: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
