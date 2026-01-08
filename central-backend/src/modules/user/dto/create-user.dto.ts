import { IsString, IsNotEmpty, IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  store_id: string;
}
