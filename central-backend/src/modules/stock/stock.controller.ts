import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('stocks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createStockDto: CreateStockDto) {
    return this.stockService.create(createStockDto);
  }

  @Get()
  findAll(@Query('storeId') storeId?: string, @Query('productId') productId?: string) {
    return this.stockService.findAll(storeId, productId);
  }

  @Get('product')
  findOne(@Query('productId') productId: string, @Query('storeId') storeId: string) {
    return this.stockService.findOne(productId, storeId);
  }

  @Post('adjust')
  @Roles(UserRole.ADMIN)
  adjustStock(@Body() adjustStockDto: AdjustStockDto, @CurrentUser() user: any) {
    return this.stockService.adjustStock(adjustStockDto, user);
  }

  @Get('low-stock')
  getLowStockProducts(@Query('storeId') storeId?: string) {
    return this.stockService.getLowStockProducts(storeId);
  }
}
