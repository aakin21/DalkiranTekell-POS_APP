import { IsArray, IsUUID, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncSaleDto {
  id: string;
  receipt_number: string;
  store_id: string;
  user_id: string;
  device_id: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  shift_id?: string;
  created_at: Date;
  items: any[];
  payments: any[];
}

export class SyncDataDto {
  @IsUUID()
  device_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncSaleDto)
  @IsOptional()
  sales?: SyncSaleDto[];

  @IsArray()
  @IsOptional()
  refunds?: any[];

  @IsArray()
  @IsOptional()
  stock_adjustments?: any[];

  @IsArray()
  @IsOptional()
  shifts?: any[];

  @IsArray()
  @IsOptional()
  audit_logs?: any[];
}

export class PullSyncDto {
  @IsUUID()
  device_id: string;

  @IsOptional()
  last_sync_at?: Date;
}
