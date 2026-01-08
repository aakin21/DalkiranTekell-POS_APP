import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Refund } from '../../entities/refund.entity';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Stock } from '../../entities/stock.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { CreateRefundDto } from './dto/create-refund.dto';

@Injectable()
export class RefundService {
  constructor(
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  async create(createRefundDto: CreateRefundDto, user: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate sale and sale item
      const sale = await queryRunner.manager.findOne(Sale, {
        where: { id: createRefundDto.sale_id },
      });

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      const saleItem = await queryRunner.manager.findOne(SaleItem, {
        where: { id: createRefundDto.sale_item_id, sale_id: createRefundDto.sale_id },
      });

      if (!saleItem) {
        throw new NotFoundException('Sale item not found');
      }

      if (createRefundDto.quantity > saleItem.quantity) {
        throw new BadRequestException('Refund quantity exceeds sold quantity');
      }

      // Calculate refund amount
      const refundAmount = saleItem.unit_price * createRefundDto.quantity;

      // Create refund
      const refund = queryRunner.manager.create(Refund, {
        sale_id: createRefundDto.sale_id,
        sale_item_id: createRefundDto.sale_item_id,
        quantity: createRefundDto.quantity,
        refund_amount: refundAmount,
        reason: createRefundDto.reason,
        store_id: createRefundDto.store_id,
        user_id: user.id,
        device_id: createRefundDto.device_id,
      });

      const savedRefund = await queryRunner.manager.save(refund);

      // Update stock - add back the refunded quantity
      let stock = await queryRunner.manager.findOne(Stock, {
        where: {
          product_id: saleItem.product_id,
          store_id: createRefundDto.store_id,
        },
      });

      if (stock) {
        stock.quantity += createRefundDto.quantity;
        await queryRunner.manager.save(stock);
      }

      // Audit log
      await queryRunner.manager.save(AuditLog, {
        action_type: AuditAction.REFUND,
        user_id: user.id,
        store_id: createRefundDto.store_id,
        device_id: createRefundDto.device_id,
        entity_id: savedRefund.id,
        metadata: {
          sale_id: createRefundDto.sale_id,
          quantity: createRefundDto.quantity,
          amount: refundAmount,
        },
      });

      await queryRunner.commitTransaction();

      return savedRefund;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(storeId?: string) {
    const where = storeId ? { store_id: storeId } : {};
    return this.refundRepository.find({
      where,
      relations: ['sale', 'sale_item', 'user', 'store'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    return this.refundRepository.findOne({
      where: { id },
      relations: ['sale', 'sale_item', 'user', 'store'],
    });
  }

  async findBySale(saleId: string) {
    return this.refundRepository.find({
      where: { sale_id: saleId },
      relations: ['sale_item', 'user'],
    });
  }
}
