import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from '../../entities/stock.entity';
import { StockAdjustment } from '../../entities/stock-adjustment.entity';
import { Product } from '../../entities/product.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, StockAdjustment, Product, AuditLog])],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
