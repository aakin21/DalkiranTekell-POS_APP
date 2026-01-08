import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string) {
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
      relations: ['store'],
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      storeId: user.store_id,
    };

    const access_token = this.jwtService.sign(payload);

    // Log login action
    await this.auditLogRepository.save({
      action_type: AuditAction.LOGIN,
      user_id: user.id,
      store_id: user.store_id,
      ip_address: ipAddress,
    });

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        store: {
          id: user.store.id,
          name: user.store.name,
        },
      },
    };
  }

  async validateUser(userId: string) {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ['store'],
    });
  }
}
