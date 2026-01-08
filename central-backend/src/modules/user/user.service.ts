import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(createUserDto: CreateUserDto, createdBy: any) {
    const existing = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Audit log
    await this.auditLogRepository.save({
      action_type: AuditAction.USER_CREATE,
      user_id: createdBy.id,
      store_id: createdBy.storeId,
      entity_id: savedUser.id,
      metadata: { username: savedUser.username },
    });

    delete savedUser.password;
    return savedUser;
  }

  async findAll(storeId?: string) {
    const where = storeId ? { store_id: storeId } : {};
    return this.userRepository.find({
      where,
      relations: ['store'],
      select: {
        id: true,
        username: true,
        full_name: true,
        role: true,
        store_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['store'],
      select: {
        id: true,
        username: true,
        full_name: true,
        role: true,
        store_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, updatedBy: any) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    const updated = await this.userRepository.save(user);

    // Audit log
    await this.auditLogRepository.save({
      action_type: AuditAction.USER_UPDATE,
      user_id: updatedBy.id,
      store_id: updatedBy.storeId,
      entity_id: updated.id,
      metadata: { changes: updateUserDto },
    });

    delete updated.password;
    return updated;
  }

  async changePassword(userId: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }
}
