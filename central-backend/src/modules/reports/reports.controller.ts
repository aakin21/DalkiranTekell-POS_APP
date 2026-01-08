import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-sales')
  getDailySalesReport(
    @Query('date') date: string,
    @Query('storeId') storeId?: string,
  ) {
    const reportDate = date ? new Date(date) : new Date();
    return this.reportsService.getDailySalesReport(reportDate, storeId);
  }

  @Get('top-products')
  getTopSellingProducts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getTopSellingProducts(
      new Date(startDate),
      new Date(endDate),
      storeId,
      limit,
    );
  }

  @Get('user-performance')
  getUserPerformance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.reportsService.getUserPerformance(
      new Date(startDate),
      new Date(endDate),
      storeId,
    );
  }

  @Get('stock')
  getStockReport(@Query('storeId') storeId?: string) {
    return this.reportsService.getStockReport(storeId);
  }

  @Get('shift/:shiftId')
  getShiftReport(@Query('shiftId') shiftId: string) {
    return this.reportsService.getShiftReport(shiftId);
  }

  @Get('total')
  getTotalReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTotalReport(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('profit-margin')
  getProfitMarginReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.reportsService.getProfitMarginReport(
      new Date(startDate),
      new Date(endDate),
      storeId,
    );
  }
}
