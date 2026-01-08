import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(
    @Query('action_type') actionType?: string,
    @Query('user_id') userId?: string,
    @Query('store_id') storeId?: string,
    @Query('device_id') deviceId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.findAll({
      action_type: actionType,
      user_id: userId,
      store_id: storeId,
      device_id: deviceId,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('user/:userId')
  async findByUser(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.findByUser(
      userId,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('store/:storeId')
  async findByStore(
    @Query('storeId') storeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.findByStore(
      storeId,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('action/:actionType')
  async findByActionType(
    @Query('actionType') actionType: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.findByActionType(
      actionType,
      limit ? parseInt(limit) : undefined,
    );
  }
}
