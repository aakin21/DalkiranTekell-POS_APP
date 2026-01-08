import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Payment } from '../../entities/payment.entity';
import { Stock } from '../../entities/stock.entity';
import { Product } from '../../entities/product.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { SaleService } from './sale.service';
import { SaleController } from './sale.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, Payment, Stock, Product, AuditLog]),
  ],
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}
