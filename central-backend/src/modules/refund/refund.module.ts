import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Refund } from '../../entities/refund.entity';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Stock } from '../../entities/stock.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Refund, Sale, SaleItem, Stock, AuditLog])],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
