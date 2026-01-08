import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../../entities/store.entity';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
  ) {}

  async create(data: Partial<Store>) {
    const store = this.storeRepository.create(data);
    return this.storeRepository.save(store);
  }

  async findAll() {
    return this.storeRepository.find();
  }

  async findOne(id: string) {
    return this.storeRepository.findOne({ where: { id } });
  }
}
