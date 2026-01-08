import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  create(@Body() createRefundDto: CreateRefundDto, @CurrentUser() user: any) {
    return this.refundService.create(createRefundDto, user);
  }

  @Get()
  findAll(@Query('storeId') storeId?: string) {
    return this.refundService.findAll(storeId);
  }

  @Get('sale/:saleId')
  findBySale(@Param('saleId') saleId: string) {
    return this.refundService.findBySale(saleId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refundService.findOne(id);
  }
}
