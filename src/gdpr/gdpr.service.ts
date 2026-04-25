import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPersistenceEntity } from '../user/infrastructure/persistence/user-persistence.entity';
import {
  DATA_EXPORTER,
  DataExportResult,
  IDataExporter,
} from './interfaces/data-exporter.interface';

@Injectable()
export class GdprService {
  constructor(
    @InjectRepository(UserPersistenceEntity)
    private readonly userRepository: Repository<UserPersistenceEntity>,
    @Inject(DATA_EXPORTER)
    private readonly dataExporter: IDataExporter,
  ) {}

  async exportUserData(userId: string): Promise<DataExportResult | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return null;

    const userData: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return this.dataExporter.export(userData);
  }

  async deleteUserData(userId: string): Promise<boolean> {
    const result = await this.userRepository.delete({ id: userId });
    return (result.affected ?? 0) > 0;
  }
}
