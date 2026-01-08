import { Controller, Post, Body } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncDataDto, PullSyncDto } from './dto/sync-data.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  pushData(@Body() syncDataDto: SyncDataDto) {
    return this.syncService.pushData(syncDataDto);
  }

  @Post('pull')
  pullData(@Body() pullSyncDto: PullSyncDto) {
    return this.syncService.pullData(pullSyncDto);
  }
}
