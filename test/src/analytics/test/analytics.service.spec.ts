import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should return credential issuance data', async () => {
    const data = await service.getCredentialIssuance();
    expect(data.totalIssued).toBeDefined();
  });

  it('should return transaction volumes', async () => {
    const data = await service.getTransactionVolumes();
    expect(data.daily.length).toBeGreaterThan(0);
  });
});
