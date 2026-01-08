import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('shifts')
@UseGuards(JwtAuthGuard)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Post('open')
  openShift(@Body() openShiftDto: OpenShiftDto, @CurrentUser() user: any) {
    return this.shiftService.openShift(openShiftDto, user);
  }

  @Post('close')
  closeShift(@Body() closeShiftDto: CloseShiftDto, @CurrentUser() user: any) {
    return this.shiftService.closeShift(closeShiftDto, user);
  }

  @Get('current')
  getCurrentShift(@Query('deviceId') deviceId: string) {
    return this.shiftService.getCurrentShift(deviceId);
  }

  @Get()
  findAll(@Query('storeId') storeId?: string) {
    return this.shiftService.findAll(storeId);
  }
}
