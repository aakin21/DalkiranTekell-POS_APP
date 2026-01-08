import { IsNumber, IsUUID, Min } from 'class-validator';

export class OpenShiftDto {
  @IsUUID()
  store_id: string;

  @IsUUID()
  device_id: string;

  @IsNumber()
  @Min(0)
  opening_cash: number;
}
