import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(data: Partial<AuditLog>): Promise<AuditLog> {
    const log = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(log);
  }

  async findAll(filters?: {
    action_type?: string;
    user_id?: string;
    store_id?: string;
    device_id?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('audit_log');

    if (filters?.action_type) {
      query.andWhere('audit_log.action_type = :action_type', {
        action_type: filters.action_type,
      });
    }

    if (filters?.user_id) {
      query.andWhere('audit_log.user_id = :user_id', {
        user_id: filters.user_id,
      });
    }

    if (filters?.store_id) {
      query.andWhere('audit_log.store_id = :store_id', {
        store_id: filters.store_id,
      });
    }

    if (filters?.device_id) {
      query.andWhere('audit_log.device_id = :device_id', {
        device_id: filters.device_id,
      });
    }

    query.orderBy('audit_log.created_at', 'DESC');

    if (filters?.limit) {
      query.limit(filters.limit);
    } else {
      query.limit(100);
    }

    return query.getMany();
  }

  async findByUser(userId: string, limit = 50): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async findByStore(storeId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { store_id: storeId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async findByActionType(
    actionType: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { action_type: actionType },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
