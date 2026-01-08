import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
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
import { SyncDataDto, PullSyncDto } from './dto/sync-data.dto';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
    @InjectRepository(Device)
    private deviceService: Repository<Device>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(StockAdjustment)
    private stockAdjustmentRepository: Repository<StockAdjustment>,
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  // Push: Local -> Central
  async pushData(syncDataDto: SyncDataDto) {
    const results: any = {
      sales: [],
      refunds: [],
      stock_adjustments: [],
      shifts: [],
      audit_logs: [],
    };

    // Sync sales
    if (syncDataDto.sales && syncDataDto.sales.length > 0) {
      for (const saleData of syncDataDto.sales) {
        try {
          // Check if sale already exists
          const existing = await this.saleRepository.findOne({
            where: { id: saleData.id },
          });

          if (!existing) {
            const sale = this.saleRepository.create(saleData);
            await this.saleRepository.save(sale);

            // Save sale items
            if (saleData.items) {
              for (const itemData of saleData.items) {
                const saleItem = this.saleItemRepository.create({
                  ...itemData,
                  sale_id: sale.id,
                });
                await this.saleItemRepository.save(saleItem);
              }
            }

            // Save payments
            if (saleData.payments) {
              for (const paymentData of saleData.payments) {
                const payment = this.paymentRepository.create({
                  ...paymentData,
                  sale_id: sale.id,
                });
                await this.paymentRepository.save(payment);
              }
            }

            results.sales.push({ id: sale.id, status: 'synced' });
          } else {
            results.sales.push({ id: saleData.id, status: 'already_exists' });
          }
        } catch (error) {
          results.sales.push({ id: saleData.id, status: 'error', error: error.message });
        }
      }
    }

    // Sync refunds
    if (syncDataDto.refunds && syncDataDto.refunds.length > 0) {
      for (const refundData of syncDataDto.refunds) {
        try {
          const existing = await this.refundRepository.findOne({
            where: { id: refundData.id },
          });

          if (!existing) {
            const refund = this.refundRepository.create(refundData);
            await this.refundRepository.save(refund);
            results.refunds.push({ id: refund.id, status: 'synced' });
          } else {
            results.refunds.push({ id: refundData.id, status: 'already_exists' });
          }
        } catch (error) {
          results.refunds.push({ id: refundData.id, status: 'error', error: error.message });
        }
      }
    }

    // Sync stock adjustments
    if (syncDataDto.stock_adjustments && syncDataDto.stock_adjustments.length > 0) {
      for (const adjustmentData of syncDataDto.stock_adjustments) {
        try {
          const existing = await this.stockAdjustmentRepository.findOne({
            where: { id: adjustmentData.id },
          });

          if (!existing) {
            const adjustment = this.stockAdjustmentRepository.create(adjustmentData);
            await this.stockAdjustmentRepository.save(adjustment);
            results.stock_adjustments.push({ id: adjustment.id, status: 'synced' });
          } else {
            results.stock_adjustments.push({ id: adjustmentData.id, status: 'already_exists' });
          }
        } catch (error) {
          results.stock_adjustments.push({ id: adjustmentData.id, status: 'error', error: error.message });
        }
      }
    }

    // Sync shifts
    if (syncDataDto.shifts && syncDataDto.shifts.length > 0) {
      for (const shiftData of syncDataDto.shifts) {
        try {
          const existing = await this.shiftRepository.findOne({
            where: { id: shiftData.id },
          });

          if (!existing) {
            const shift = this.shiftRepository.create(shiftData);
            await this.shiftRepository.save(shift);
            results.shifts.push({ id: shift.id, status: 'synced' });
          } else {
            results.shifts.push({ id: shiftData.id, status: 'already_exists' });
          }
        } catch (error) {
          results.shifts.push({ id: shiftData.id, status: 'error', error: error.message });
        }
      }
    }

    // Sync audit logs
    if (syncDataDto.audit_logs && syncDataDto.audit_logs.length > 0) {
      for (const logData of syncDataDto.audit_logs) {
        try {
          const existing = await this.auditLogRepository.findOne({
            where: { id: logData.id },
          });

          if (!existing) {
            const auditLog = this.auditLogRepository.create(logData);
            await this.auditLogRepository.save(auditLog);
            results.audit_logs.push({ id: auditLog.id, status: 'synced' });
          } else {
            results.audit_logs.push({ id: logData.id, status: 'already_exists' });
          }
        } catch (error) {
          results.audit_logs.push({ id: logData.id, status: 'error', error: error.message });
        }
      }
    }

    // Update device last sync time
    await this.deviceService.update(syncDataDto.device_id, {
      last_sync_at: new Date(),
    });

    return results;
  }

  // Pull: Central -> Local
  async pullData(pullSyncDto: PullSyncDto) {
    const device = await this.deviceService.findOne({
      where: { id: pullSyncDto.device_id },
      relations: ['store'],
    });

    if (!device) {
      throw new Error('Device not found');
    }

    const storeId = device.store_id;
    const lastSyncAt = pullSyncDto.last_sync_at || new Date(0);

    // Get updated products
    const products = await this.productRepository.find({
      where: { updated_at: MoreThan(lastSyncAt) },
      relations: ['category'],
    });

    // Get updated categories
    const categories = await this.categoryRepository.find({
      where: { updated_at: MoreThan(lastSyncAt) },
    });

    // Get updated users for this store
    const users = await this.userRepository.find({
      where: {
        store_id: storeId,
        updated_at: MoreThan(lastSyncAt),
      },
      select: {
        id: true,
        username: true,
        full_name: true,
        role: true,
        store_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Get store info
    const store = await this.storeRepository.findOne({
      where: { id: storeId },
    });

    return {
      products,
      categories,
      users,
      store,
      sync_timestamp: new Date(),
    };
  }
}
