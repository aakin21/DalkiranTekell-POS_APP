import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Payment } from '../../entities/payment.entity';
import { Stock } from '../../entities/stock.entity';
import { Product } from '../../entities/product.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SaleService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  async create(createSaleDto: CreateSaleDto, user: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Calculate total
      let totalAmount = 0;
      for (const item of createSaleDto.items) {
        totalAmount += item.quantity * item.unit_price;
      }

      const discountAmount = createSaleDto.discount_amount || 0;
      const finalAmount = totalAmount - discountAmount;

      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create sale
      const sale = queryRunner.manager.create(Sale, {
        receipt_number: receiptNumber,
        store_id: createSaleDto.store_id,
        user_id: user.id,
        device_id: createSaleDto.device_id,
        shift_id: createSaleDto.shift_id,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
      });

      const savedSale = await queryRunner.manager.save(sale);

      // Create sale items and update stock
      for (const itemDto of createSaleDto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: itemDto.product_id },
        });

        if (!product) {
          throw new BadRequestException(`Product ${itemDto.product_id} not found`);
        }

        const saleItem = queryRunner.manager.create(SaleItem, {
          sale_id: savedSale.id,
          product_id: itemDto.product_id,
          product_name: product.name,
          barcode: product.barcode,
          quantity: itemDto.quantity,
          unit_price: itemDto.unit_price,
          total_price: itemDto.quantity * itemDto.unit_price,
        });

        await queryRunner.manager.save(saleItem);

        // Update stock
        let stock = await queryRunner.manager.findOne(Stock, {
          where: {
            product_id: itemDto.product_id,
            store_id: createSaleDto.store_id,
          },
        });

        if (stock) {
          stock.quantity -= itemDto.quantity;
          await queryRunner.manager.save(stock);
        }
      }

      // Create payments
      for (const paymentDto of createSaleDto.payments) {
        const payment = queryRunner.manager.create(Payment, {
          sale_id: savedSale.id,
          method: paymentDto.method,
          amount: paymentDto.amount,
        });

        await queryRunner.manager.save(payment);
      }

      // Audit log
      await queryRunner.manager.save(AuditLog, {
        action_type: AuditAction.SALE,
        user_id: user.id,
        store_id: createSaleDto.store_id,
        device_id: createSaleDto.device_id,
        entity_id: savedSale.id,
        metadata: { receipt_number: receiptNumber, total: finalAmount },
      });

      await queryRunner.commitTransaction();

      return await this.saleRepository.findOne({
        where: { id: savedSale.id },
        relations: ['items', 'payments'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(storeId?: string) {
    const where = storeId ? { store_id: storeId } : {};
    return this.saleRepository.find({
      where,
      relations: ['items', 'payments', 'user', 'store'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    return this.saleRepository.findOne({
      where: { id },
      relations: ['items', 'payments', 'user', 'store'],
    });
  }
}
