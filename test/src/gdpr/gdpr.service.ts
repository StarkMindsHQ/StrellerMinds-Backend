import { Injectable } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { DataExportService } from './data-export.service';
import { DataDeletionService } from './data-deletion.service';

/**
 * GdprService provides logic for user consent, data export, and deletion requests.
 */
@Injectable()
export class GdprService {
  constructor(
    private consentService: ConsentService,
    private dataExportService: DataExportService,
    private dataDeletionService: DataDeletionService,
  ) {}

  /**
   * Get the consent service instance.
   */
  getConsentService() {
    return this.consentService;
  }

  /**
   * Get the data export service instance.
   */
  getDataExportService() {
    return this.dataExportService;
  }

  /**
   * Get the data deletion service instance.
   */
  getDataDeletionService() {
    return this.dataDeletionService;
  }

  /**
   * Generate a compliance report for a user.
   * @param userId - User ID
   * @returns Compliance report object
   */
  async generateComplianceReport(userId: string): Promise<any> {
    const consents = await this.consentService.getUserConsents(userId);
    const deletionRequests =
      await this.dataDeletionService.getDeletionRequests(userId);

    return {
      userId,
      generatedAt: new Date().toISOString(),
      consents: consents.length,
      activeDeletionRequests: deletionRequests.filter(
        (r) => r.status === 'pending' || r.status === 'in_progress',
      ).length,
      completedDeletionRequests: deletionRequests.filter(
        (r) => r.status === 'completed',
      ).length,
    };
  }
}
