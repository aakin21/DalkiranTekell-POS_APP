import { IsUUID, IsNumber, Min } from 'class-validator';

export class CreateStockDto {
  @IsUUID()
  product_id: string;

  @IsUUID()
  store_id: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}
