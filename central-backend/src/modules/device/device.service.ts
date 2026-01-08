import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  async create(createDeviceDto: CreateDeviceDto) {
    // Generate activation code
    const activationCode = this.generateActivationCode();

    const device = this.deviceRepository.create({
      store_id: createDeviceDto.store_id,
      activation_code: activationCode,
      is_activated: false,
    });

    return this.deviceRepository.save(device);
  }

  async activate(activationCode: string) {
    const device = await this.deviceRepository.findOne({
      where: { activation_code: activationCode },
      relations: ['store'],
    });

    if (!device) {
      throw new NotFoundException('Invalid activation code');
    }

    // Zaten aktive edilmişse, aynı device bilgilerini döndür
    // Bu sayede aynı kod ile birden fazla kez giriş yapılabilir
    if (device.is_activated) {
      return {
        device_id: device.id,
        store_id: device.store_id,
        store_name: device.store.name,
      };
    }

    device.is_activated = true;
    device.activated_at = new Date();

    const activated = await this.deviceRepository.save(device);

    return {
      device_id: activated.id,
      store_id: activated.store_id,
      store_name: activated.store.name,
    };
  }

  async updateLastSync(deviceId: string) {
    await this.deviceRepository.update(deviceId, {
      last_sync_at: new Date(),
    });
  }

  async findAll(storeId?: string) {
    const where = storeId ? { store_id: storeId } : {};
    return this.deviceRepository.find({
      where,
      relations: ['store'],
    });
  }

  async findOne(id: string) {
    return this.deviceRepository.findOne({
      where: { id },
      relations: ['store'],
    });
  }

  private generateActivationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
