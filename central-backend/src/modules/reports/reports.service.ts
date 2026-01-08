import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Payment, PaymentMethod } from '../../entities/payment.entity';
import { Shift } from '../../entities/shift.entity';
import { Stock } from '../../entities/stock.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getDailySalesReport(date: Date, storeId?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      created_at: Between(startOfDay, endOfDay),
    };

    if (storeId) {
      where.store_id = storeId;
    }

    const sales = await this.saleRepository.find({
      where,
      relations: ['items', 'payments', 'user', 'store'],
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.final_amount), 0);

    const cashPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.sale', 'sale')
      .where('sale.created_at BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .andWhere('payment.method = :method', { method: PaymentMethod.CASH })
      .andWhere(storeId ? 'sale.store_id = :storeId' : '1=1', { storeId })
      .getMany();

    const cardPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.sale', 'sale')
      .where('sale.created_at BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .andWhere('payment.method = :method', { method: PaymentMethod.CARD })
      .andWhere(storeId ? 'sale.store_id = :storeId' : '1=1', { storeId })
      .getMany();

    const totalCash = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalCard = cardPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      date,
      storeId,
      totalSales,
      totalRevenue,
      cashRevenue: totalCash,
      cardRevenue: totalCard,
      sales,
    };
  }

  async getTopSellingProducts(startDate: Date, endDate: Date, storeId?: string, limit = 10) {
    const query = this.saleItemRepository
      .createQueryBuilder('saleItem')
      .leftJoin('saleItem.sale', 'sale')
      .leftJoin('saleItem.product', 'product')
      .select('saleItem.product_id', 'product_id')
      .addSelect('product.name', 'product_name')
      .addSelect('product.barcode', 'barcode')
      .addSelect('SUM(saleItem.quantity)', 'total_quantity')
      .addSelect('SUM(saleItem.total_price)', 'total_revenue')
      .where('sale.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('saleItem.product_id')
      .addGroupBy('product.name')
      .addGroupBy('product.barcode')
      .orderBy('total_quantity', 'DESC')
      .limit(limit);

    if (storeId) {
      query.andWhere('sale.store_id = :storeId', { storeId });
    }

    return query.getRawMany();
  }

  async getUserPerformance(startDate: Date, endDate: Date, storeId?: string) {
    const query = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoin('sale.user', 'user')
      .select('sale.user_id', 'user_id')
      .addSelect('user.username', 'username')
      .addSelect('user.full_name', 'full_name')
      .addSelect('COUNT(sale.id)', 'total_sales')
      .addSelect('SUM(sale.final_amount)', 'total_revenue')
      .where('sale.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('sale.user_id')
      .addGroupBy('user.username')
      .addGroupBy('user.full_name')
      .orderBy('total_revenue', 'DESC');

    if (storeId) {
      query.andWhere('sale.store_id = :storeId', { storeId });
    }

    return query.getRawMany();
  }

  async getStockReport(storeId?: string) {
    const where = storeId ? { store_id: storeId } : {};
    return this.stockRepository.find({
      where,
      relations: ['product', 'store'],
      order: { quantity: 'ASC' },
    });
  }

  async getShiftReport(shiftId: string) {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['user', 'store'],
    });

    if (!shift) {
      return null;
    }

    const sales = await this.saleRepository.find({
      where: { shift_id: shiftId },
      relations: ['items', 'payments'],
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.final_amount), 0);

    return {
      shift,
      totalSales,
      totalRevenue,
      sales,
    };
  }

  async getTotalReport(startDate: Date, endDate: Date) {
    const sales = await this.saleRepository.find({
      where: {
        created_at: Between(startDate, endDate),
      },
      relations: ['store', 'payments'],
    });

    const storeStats: any = {};

    for (const sale of sales) {
      const storeId = sale.store_id;
      const storeName = sale.store.name;

      if (!storeStats[storeId]) {
        storeStats[storeId] = {
          storeId,
          storeName,
          totalSales: 0,
          totalRevenue: 0,
          cashRevenue: 0,
          cardRevenue: 0,
        };
      }

      storeStats[storeId].totalSales += 1;
      storeStats[storeId].totalRevenue += Number(sale.final_amount);

      for (const payment of sale.payments) {
        if (payment.method === PaymentMethod.CASH) {
          storeStats[storeId].cashRevenue += Number(payment.amount);
        } else {
          storeStats[storeId].cardRevenue += Number(payment.amount);
        }
      }
    }

    const stores = Object.values(storeStats);
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.final_amount), 0);

    return {
      startDate,
      endDate,
      totalSales,
      totalRevenue,
      stores,
    };
  }

  async getProfitMarginReport(startDate: Date, endDate: Date, storeId?: string) {
    const query = this.saleItemRepository
      .createQueryBuilder('saleItem')
      .leftJoin('saleItem.sale', 'sale')
      .leftJoin('saleItem.product', 'product')
      .select('saleItem.product_id', 'product_id')
      .addSelect('product.name', 'product_name')
      .addSelect('product.barcode', 'barcode')
      .addSelect('product.cost_price', 'cost_price')
      .addSelect('SUM(saleItem.quantity)', 'total_quantity')
      .addSelect('AVG(saleItem.unit_price)', 'avg_selling_price')
      .addSelect('SUM(saleItem.total_price)', 'total_revenue')
      .addSelect('SUM(saleItem.quantity * product.cost_price)', 'total_cost')
      .addSelect('SUM(saleItem.total_price) - SUM(saleItem.quantity * product.cost_price)', 'total_profit')
      .where('sale.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('saleItem.product_id')
      .addGroupBy('product.name')
      .addGroupBy('product.barcode')
      .addGroupBy('product.cost_price')
      .orderBy('total_profit', 'DESC');

    if (storeId) {
      query.andWhere('sale.store_id = :storeId', { storeId });
    }

    const results = await query.getRawMany();

    // Kar marjı yüzdesini hesapla
    const processedResults = results.map(item => ({
      ...item,
      profit_margin_percentage: item.total_cost > 0
        ? ((item.total_profit / item.total_cost) * 100).toFixed(2)
        : 0,
    }));

    const totalRevenue = results.reduce((sum, item) => sum + parseFloat(item.total_revenue || 0), 0);
    const totalCost = results.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const overallProfitMargin = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(2) : 0;

    return {
      startDate,
      endDate,
      storeId,
      products: processedResults,
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        overallProfitMargin,
      },
    };
  }
}
