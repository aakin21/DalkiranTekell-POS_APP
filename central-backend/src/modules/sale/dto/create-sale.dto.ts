import { IsArray, IsNumber, IsOptional, IsUUID, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../entities/payment.entity';

export class SaleItemDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unit_price: number;
}

export class PaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsNumber()
  amount: number;
}

export class CreateSaleDto {
  @IsUUID()
  store_id: string;

  @IsUUID()
  device_id: string;

  @IsUUID()
  @IsOptional()
  shift_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];

  @IsNumber()
  @IsOptional()
  discount_amount?: number;
}
