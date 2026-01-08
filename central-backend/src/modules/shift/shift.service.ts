import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift } from '../../entities/shift.entity';
import { Sale } from '../../entities/sale.entity';
import { Payment, PaymentMethod } from '../../entities/payment.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async openShift(openShiftDto: OpenShiftDto, user: any) {
    // Check if there's already an open shift for this device
    const existingShift = await this.shiftRepository.findOne({
      where: {
        device_id: openShiftDto.device_id,
        is_open: true,
      },
    });

    if (existingShift) {
      throw new BadRequestException('There is already an open shift for this device');
    }

    const shift = this.shiftRepository.create({
      store_id: openShiftDto.store_id,
      user_id: user.id,
      device_id: openShiftDto.device_id,
      opening_cash: openShiftDto.opening_cash,
      opened_at: new Date(),
      is_open: true,
    });

    const saved = await this.shiftRepository.save(shift);

    // Audit log
    await this.auditLogRepository.save({
      action_type: AuditAction.SHIFT_OPEN,
      user_id: user.id,
      store_id: openShiftDto.store_id,
      device_id: openShiftDto.device_id,
      entity_id: saved.id,
      metadata: { opening_cash: openShiftDto.opening_cash },
    });

    return saved;
  }

  async closeShift(closeShiftDto: CloseShiftDto, user: any) {
    const shift = await this.shiftRepository.findOne({
      where: { id: closeShiftDto.shift_id },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (!shift.is_open) {
      throw new BadRequestException('Shift is already closed');
    }

    // Calculate expected cash from sales
    const sales = await this.saleRepository.find({
      where: { shift_id: shift.id },
      relations: ['payments'],
    });

    let totalCashPayments = shift.opening_cash;
    for (const sale of sales) {
      const cashPayments = sale.payments.filter(
        (p) => p.method === PaymentMethod.CASH,
      );
      const cashTotal = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      totalCashPayments += cashTotal;
    }

    const cashDifference = closeShiftDto.closing_cash - totalCashPayments;

    shift.closing_cash = closeShiftDto.closing_cash;
    shift.expected_cash = totalCashPayments;
    shift.cash_difference = cashDifference;
    shift.closed_at = new Date();
    shift.is_open = false;

    const closed = await this.shiftRepository.save(shift);

    // Audit log
    await this.auditLogRepository.save({
      action_type: AuditAction.SHIFT_CLOSE,
      user_id: user.id,
      store_id: shift.store_id,
      device_id: shift.device_id,
      entity_id: closed.id,
      metadata: {
        closing_cash: closeShiftDto.closing_cash,
        expected_cash: totalCashPayments,
        difference: cashDifference,
      },
    });

    return closed;
  }

  async getCurrentShift(deviceId: string) {
    return this.shiftRepository.findOne({
      where: {
        device_id: deviceId,
        is_open: true,
      },
    });
  }

  async findAll(storeId?: string) {
    const where: any = {};
    if (storeId) {
      where.store_id = storeId;
    }

    return this.shiftRepository.find({
      where,
      relations: ['user', 'store'],
      order: { opened_at: 'DESC' },
    });
  }
}
