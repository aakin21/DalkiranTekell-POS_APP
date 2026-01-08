import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateRefundDto {
  @IsUUID()
  sale_id: string;

  @IsUUID()
  sale_item_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsUUID()
  store_id: string;

  @IsUUID()
  device_id: string;
}
