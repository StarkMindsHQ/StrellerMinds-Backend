import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './entity/certificate.entity';
import { CertificatesService } from './certificate.service';
import { CertificatesController } from './certificate.controller';

/**
 * CertificateModule provides certificate management features.
 *
 * @module Certificate
 */
@Module({
  imports: [TypeOrmModule.forFeature([Certificate])],
  controllers: [CertificatesController],
  providers: [CertificatesService],
})
export class CertificateModule {}
