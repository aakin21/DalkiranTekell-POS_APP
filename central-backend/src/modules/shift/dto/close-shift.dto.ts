import { IsNumber, IsUUID, Min } from 'class-validator';

export class CloseShiftDto {
  @IsUUID()
  shift_id: string;

  @IsNumber()
  @Min(0)
  closing_cash: number;
}
