import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxDocument } from './entities/tax-document.entity';
import { TaxAdvisor } from './entities/tax-advisor.entity';
import { AdvisorPropertyAssignment } from './entities/advisor-property-assignment.entity';
import { TaxDocumentsService } from './services/tax-documents.service';
import { TaxAdvisorsService } from './services/tax-advisors.service';
import { TaxDocumentsController } from './controllers/tax-documents.controller';
import { TaxAdvisorsController } from './controllers/tax-advisors.controller';
import { IpfsService } from './ipfs/ipfs.service';
import { IpfsClient } from './ipfs/ipfs-client';
import { LocalIpfsClient } from './ipfs/local-ipfs-client';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaxDocument, TaxAdvisor, AdvisorPropertyAssignment]),
  ],
  controllers: [TaxDocumentsController, TaxAdvisorsController],
  providers: [
    TaxDocumentsService,
    TaxAdvisorsService,
    IpfsService,
    { provide: IpfsClient, useClass: LocalIpfsClient },
  ],
  exports: [TaxDocumentsService, TaxAdvisorsService, IpfsService],
})
export class TaxModule {}
