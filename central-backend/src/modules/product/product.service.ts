import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { PriceHistory } from '../../entities/price-history.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(createProductDto: CreateProductDto, user: any) {
    const existing = await this.productRepository.findOne({
      where: { barcode: createProductDto.barcode },
    });

    if (existing) {
      throw new ConflictException('Barcode already exists');
    }

    const product = this.productRepository.create(createProductDto);
    const saved = await this.productRepository.save(product);

    await this.auditLogRepository.save({
      action_type: AuditAction.PRODUCT_CREATE,
      user_id: user.id,
      store_id: user.storeId,
      entity_id: saved.id,
      metadata: { barcode: saved.barcode, name: saved.name },
    });

    return saved;
  }

  async findAll() {
    return this.productRepository.find({ relations: ['category'] });
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findByBarcode(barcode: string) {
    return this.productRepository.findOne({
      where: { barcode },
      relations: ['category'],
    });
  }

  async updatePrice(id: string, newPrice: number, user: any) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const oldPrice = product.price;
    product.price = newPrice;
    await this.productRepository.save(product);

    await this.priceHistoryRepository.save({
      product_id: id,
      old_price: oldPrice,
      new_price: newPrice,
      changed_by: user.id,
    });

    await this.auditLogRepository.save({
      action_type: AuditAction.PRICE_CHANGE,
      user_id: user.id,
      store_id: user.storeId,
      entity_id: id,
      metadata: { old_price: oldPrice, new_price: newPrice },
    });

    return product;
  }

  async update(id: string, updateData: Partial<Product>, user: any) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    Object.assign(product, updateData);
    const updated = await this.productRepository.save(product);

    await this.auditLogRepository.save({
      action_type: AuditAction.PRODUCT_UPDATE,
      user_id: user.id,
      store_id: user.storeId,
      entity_id: id,
      metadata: { changes: updateData },
    });

    return updated;
  }
}
