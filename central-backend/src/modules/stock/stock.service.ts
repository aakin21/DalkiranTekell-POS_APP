import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../../entities/stock.entity';
import { StockAdjustment, AdjustmentType } from '../../entities/stock-adjustment.entity';
import { Product } from '../../entities/product.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(StockAdjustment)
    private stockAdjustmentRepository: Repository<StockAdjustment>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(createStockDto: CreateStockDto) {
    let stock = await this.stockRepository.findOne({
      where: {
        product_id: createStockDto.product_id,
        store_id: createStockDto.store_id,
      },
    });

    if (stock) {
      stock.quantity = createStockDto.quantity;
      return this.stockRepository.save(stock);
    }

    stock = this.stockRepository.create(createStockDto);
    return this.stockRepository.save(stock);
  }

  async findAll(storeId?: string, productId?: string) {
    const where: any = {};
    if (storeId) where.store_id = storeId;
    if (productId) where.product_id = productId;

    return this.stockRepository.find({
      where,
      relations: ['product', 'store'],
    });
  }

  async findOne(productId: string, storeId: string) {
    const stock = await this.stockRepository.findOne({
      where: {
        product_id: productId,
        store_id: storeId,
      },
      relations: ['product', 'store'],
    });

    if (!stock) {
      throw new NotFoundException('Stock not found');
    }

    return stock;
  }

  async adjustStock(adjustStockDto: AdjustStockDto, user: any) {
    const product = await this.productRepository.findOne({
      where: { id: adjustStockDto.product_id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let stock = await this.stockRepository.findOne({
      where: {
        product_id: adjustStockDto.product_id,
        store_id: adjustStockDto.store_id,
      },
    });

    if (!stock) {
      stock = this.stockRepository.create({
        product_id: adjustStockDto.product_id,
        store_id: adjustStockDto.store_id,
        quantity: 0,
      });
      await this.stockRepository.save(stock);
    }

    const oldStock = stock.quantity;
    let newStock = oldStock;

    switch (adjustStockDto.adjustment_type) {
      case AdjustmentType.ADD:
        newStock = oldStock + adjustStockDto.quantity;
        break;
      case AdjustmentType.REMOVE:
        newStock = oldStock - adjustStockDto.quantity;
        break;
      case AdjustmentType.SET:
        newStock = adjustStockDto.quantity;
        break;
    }

    stock.quantity = newStock;
    await this.stockRepository.save(stock);

    // Create adjustment record
    await this.stockAdjustmentRepository.save({
      product_id: adjustStockDto.product_id,
      store_id: adjustStockDto.store_id,
      adjustment_type: adjustStockDto.adjustment_type,
      quantity: adjustStockDto.quantity,
      old_stock: oldStock,
      new_stock: newStock,
      reason: adjustStockDto.reason,
      user_id: user.id,
    });

    // Audit log
    await this.auditLogRepository.save({
      action_type: AuditAction.STOCK_ADJUSTMENT,
      user_id: user.id,
      store_id: adjustStockDto.store_id,
      entity_id: stock.id,
      metadata: {
        product_id: adjustStockDto.product_id,
        old_stock: oldStock,
        new_stock: newStock,
        reason: adjustStockDto.reason,
      },
    });

    return stock;
  }

  async getLowStockProducts(storeId?: string) {
    const query = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.store', 'store')
      .where('stock.quantity <= product.minimum_stock');

    if (storeId) {
      query.andWhere('stock.store_id = :storeId', { storeId });
    }

    return query.getMany();
  }
}
