import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { StoreModule } from './modules/store/store.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { SaleModule } from './modules/sale/sale.module';
import { ShiftModule } from './modules/shift/shift.module';
import { DeviceModule } from './modules/device/device.module';
import { StockModule } from './modules/stock/stock.module';
import { RefundModule } from './modules/refund/refund.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      exclude: ['/auth*', '/users*', '/stores*', '/categories*', '/products*', '/sales*', '/shifts*', '/devices*', '/stocks*', '/refunds*', '/reports*', '/sync*', '/audit-logs*'],
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
    StoreModule,
    CategoryModule,
    ProductModule,
    SaleModule,
    ShiftModule,
    DeviceModule,
    StockModule,
    RefundModule,
    ReportsModule,
    SyncModule,
    AuditLogModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
