import { IsUUID } from 'class-validator';

export class CreateDeviceDto {
  @IsUUID()
  store_id: string;
}
