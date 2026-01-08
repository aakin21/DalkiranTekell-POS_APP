import { IsUUID, IsNumber, IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { AdjustmentType } from '../../../entities/stock-adjustment.entity';

export class AdjustStockDto {
  @IsUUID()
  product_id: string;

  @IsUUID()
  store_id: string;

  @IsEnum(AdjustmentType)
  adjustment_type: AdjustmentType;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
