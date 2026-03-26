import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ConfigAuditService } from './config-audit.service';
import { ConfigEncryptionService } from './config-encryption.service';

export interface ConfigVersion {
  version: string;
  timestamp: Date;
  checksum: string;
  environment: string;
  author?: string;
  description?: string;
  configData: Record<string, any>;
  isEncrypted: boolean;
  keyId?: string;
  parentVersion?: string;
  tags?: string[];
}

export interface ConfigDiff {
  version1: string;
  version2: string;
  added: Record<string, any>;
  modified: Record<string, { old: any; new: any }>;
  deleted: string[];
}

export interface VersionFilter {
  environment?: string;
  author?: string;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class ConfigVersioningService {
  private readonly logger = new Logger(ConfigVersioningService.name);
  private readonly versionsPath = path.join(process.cwd(), '.config-versions');
  private readonly currentVersionFile = path.join(this.versionsPath, 'current-version.json');
  private readonly maxVersions = 100;

  constructor(
    private readonly auditService: ConfigAuditService,
    private readonly encryptionService: ConfigEncryptionService,
  ) {
    this.ensureVersionsDirectory();
  }

  private ensureVersionsDirectory(): void {
    if (!fs.existsSync(this.versionsPath)) {
      fs.mkdirSync(this.versionsPath, { recursive: true });
      this.logger.log(`Created config versions directory: ${this.versionsPath}`);
    }
  }

  private generateVersionNumber(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = crypto.randomBytes(4).toString('hex');
    return `v${timestamp}-${random}`;
  }

  private calculateChecksum(data: Record<string, any>): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private getVersionFilePath(version: string): string {
    return path.join(this.versionsPath, `${version}.json`);
  }

  private getCurrentVersion(): string | null {
    try {
      if (!fs.existsSync(this.currentVersionFile)) {
        return null;
      }
      
      const currentData = fs.readFileSync(this.currentVersionFile, 'utf8');
      const current = JSON.parse(currentData);
      return current.version;
    } catch (error) {
      this.logger.error(`Failed to read current version: ${error.message}`);
      return null;
    }
  }

  private setCurrentVersion(version: string): void {
    try {
      const currentData = {
        version,
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(this.currentVersionFile, JSON.stringify(currentData, null, 2));
      this.logger.debug(`Set current version to: ${version}`);
    } catch (error) {
      this.logger.error(`Failed to set current version: ${error.message}`);
    }
  }

  private async cleanupOldVersions(): Promise<void> {
    try {
      const versions = await this.listVersions();
      if (versions.length <= this.maxVersions) {
        return;
      }

      // Sort by timestamp and keep only the most recent versions
      versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const versionsToDelete = versions.slice(this.maxVersions);

      for (const version of versionsToDelete) {
        const versionPath = this.getVersionFilePath(version.version);
        if (fs.existsSync(versionPath)) {
          fs.unlinkSync(versionPath);
          this.logger.debug(`Deleted old version: ${version.version}`);
        }
      }

      this.logger.log(`Cleaned up ${versionsToDelete.length} old config versions`);
    } catch (error) {
      this.logger.error(`Failed to cleanup old versions: ${error.message}`);
    }
  }

  async createVersion(
    configData: Record<string, any>,
    options: {
      author?: string;
      description?: string;
      tags?: string[];
      encrypt?: boolean;
      keyId?: string;
    } = {}
  ): Promise<string> {
    try {
      const version = this.generateVersionNumber();
      const checksum = this.calculateChecksum(configData);
      const parentVersion = this.getCurrentVersion();
      
      let processedConfigData = configData;
      let isEncrypted = false;
      let keyId: string | undefined;

      if (options.encrypt) {
        keyId = options.keyId || 'default';
        processedConfigData = this.encryptionService.encryptObject(configData, keyId);
        isEncrypted = true;
      }

      const configVersion: ConfigVersion = {
        version,
        timestamp: new Date(),
        checksum,
        environment: process.env.NODE_ENV || 'unknown',
        author: options.author,
        description: options.description,
        configData: processedConfigData,
        isEncrypted,
        keyId,
        parentVersion,
        tags: options.tags,
      };

      const versionPath = this.getVersionFilePath(version);
      fs.writeFileSync(versionPath, JSON.stringify(configVersion, null, 2));
      
      this.setCurrentVersion(version);
      await this.cleanupOldVersions();

      this.auditService.logConfigChange(
        'CREATE',
        `version:${version}`,
        parentVersion,
        version,
        options.author,
      );

      this.logger.log(`Created config version: ${version}`);
      return version;
    } catch (error) {
      this.auditService.logConfigError(
        'CREATE',
        'version',
        error.message,
        options.author,
      );
      this.logger.error(`Failed to create config version: ${error.message}`);
      throw new Error(`Version creation failed: ${error.message}`);
    }
  }

  async getVersion(version: string): Promise<ConfigVersion | null> {
    try {
      const versionPath = this.getVersionFilePath(version);
      if (!fs.existsSync(versionPath)) {
        return null;
      }

      const versionData = fs.readFileSync(versionPath, 'utf8');
      const configVersion: ConfigVersion = JSON.parse(versionData);

      if (configVersion.isEncrypted) {
        configVersion.configData = this.encryptionService.decryptObject(
          configVersion.configData as any,
          configVersion.keyId
        );
      }

      return configVersion;
    } catch (error) {
      this.logger.error(`Failed to get version ${version}: ${error.message}`);
      return null;
    }
  }

  async getCurrentVersionData(): Promise<ConfigVersion | null> {
    const currentVersion = this.getCurrentVersion();
    if (!currentVersion) {
      return null;
    }
    return this.getVersion(currentVersion);
  }

  async listVersions(filter?: VersionFilter): Promise<ConfigVersion[]> {
    try {
      if (!fs.existsSync(this.versionsPath)) {
        return [];
      }

      const files = fs.readdirSync(this.versionsPath)
        .filter(file => file.endsWith('.json') && file !== 'current-version.json');

      const versions: ConfigVersion[] = [];

      for (const file of files) {
        try {
          const versionPath = path.join(this.versionsPath, file);
          const versionData = fs.readFileSync(versionPath, 'utf8');
          const version: ConfigVersion = JSON.parse(versionData);

          // Apply filters
          if (filter) {
            if (filter.environment && version.environment !== filter.environment) continue;
            if (filter.author && version.author !== filter.author) continue;
            if (filter.tags && !filter.tags.some(tag => version.tags?.includes(tag))) continue;
            if (filter.startDate && new Date(version.timestamp) < filter.startDate) continue;
            if (filter.endDate && new Date(version.timestamp) > filter.endDate) continue;
          }

          versions.push(version);
        } catch (parseError) {
          this.logger.warn(`Failed to parse version file ${file}: ${parseError.message}`);
        }
      }

      return versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      this.logger.error(`Failed to list versions: ${error.message}`);
      return [];
    }
  }

  async deleteVersion(version: string, author?: string): Promise<boolean> {
    try {
      const versionPath = this.getVersionFilePath(version);
      if (!fs.existsSync(versionPath)) {
        return false;
      }

      fs.unlinkSync(versionPath);

      // If this was the current version, try to set the previous version as current
      const currentVersion = this.getCurrentVersion();
      if (currentVersion === version) {
        const versions = await this.listVersions();
        if (versions.length > 0) {
          this.setCurrentVersion(versions[0].version);
        }
      }

      this.auditService.logConfigChange(
        'DELETE',
        `version:${version}`,
        version,
        undefined,
        author,
      );

      this.logger.log(`Deleted config version: ${version}`);
      return true;
    } catch (error) {
      this.auditService.logConfigError(
        'DELETE',
        `version:${version}`,
        error.message,
        author,
      );
      this.logger.error(`Failed to delete version ${version}: ${error.message}`);
      return false;
    }
  }

  async compareVersions(version1: string, version2: string): Promise<ConfigDiff | null> {
    try {
      const v1Data = await this.getVersion(version1);
      const v2Data = await this.getVersion(version2);

      if (!v1Data || !v2Data) {
        return null;
      }

      const added: Record<string, any> = {};
      const modified: Record<string, { old: any; new: any }> = {};
      const deleted: string[] = [];

      const keys1 = new Set(Object.keys(v1Data.configData));
      const keys2 = new Set(Object.keys(v2Data.configData));

      // Find added keys
      for (const key of keys2) {
        if (!keys1.has(key)) {
          added[key] = v2Data.configData[key];
        }
      }

      // Find deleted keys
      for (const key of keys1) {
        if (!keys2.has(key)) {
          deleted.push(key);
        }
      }

      // Find modified keys
      for (const key of keys1) {
        if (keys2.has(key)) {
          const val1 = v1Data.configData[key];
          const val2 = v2Data.configData[key];
          
          if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            modified[key] = { old: val1, new: val2 };
          }
        }
      }

      return {
        version1,
        version2,
        added,
        modified,
        deleted,
      };
    } catch (error) {
      this.logger.error(`Failed to compare versions: ${error.message}`);
      return null;
    }
  }

  async rollbackToVersion(version: string, author?: string): Promise<Record<string, any> | null> {
    try {
      const versionData = await this.getVersion(version);
      if (!versionData) {
        throw new Error(`Version ${version} not found`);
      }

      // Create a new version based on the rollback
      const newVersion = await this.createVersion(versionData.configData, {
        author,
        description: `Rollback to version ${version}`,
        tags: ['rollback'],
      });

      this.auditService.logConfigChange(
        'UPDATE',
        `rollback:${version}`,
        this.getCurrentVersion() || 'unknown',
        newVersion,
        author,
      );

      this.logger.log(`Rolled back to version ${version}, created new version ${newVersion}`);
      return versionData.configData;
    } catch (error) {
      this.auditService.logConfigError(
        'UPDATE',
        `rollback:${version}`,
        error.message,
        author,
      );
      this.logger.error(`Failed to rollback to version ${version}: ${error.message}`);
      return null;
    }
  }

  async getVersionHistory(configKey?: string, limit: number = 50): Promise<ConfigVersion[]> {
    try {
      const versions = await this.listVersions();
      
      if (configKey) {
        // Filter versions that contain the specific config key
        return versions
          .filter(version => version.configData.hasOwnProperty(configKey))
          .slice(0, limit);
      }

      return versions.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to get version history: ${error.message}`);
      return [];
    }
  }

  async exportVersion(version: string, outputPath: string): Promise<void> {
    try {
      const versionData = await this.getVersion(version);
      if (!versionData) {
        throw new Error(`Version ${version} not found`);
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: versionData,
      };

      fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
      this.logger.log(`Exported version ${version} to: ${outputPath}`);
    } catch (error) {
      this.logger.error(`Failed to export version ${version}: ${error.message}`);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  async importVersion(inputPath: string, author?: string): Promise<string> {
    try {
      const importData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
      const versionData: ConfigVersion = importData.version;

      // Generate a new version number to avoid conflicts
      const newVersion = await this.createVersion(versionData.configData, {
        author,
        description: `Imported from ${inputPath}`,
        tags: ['imported'],
      });

      this.logger.log(`Imported version as ${newVersion} from: ${inputPath}`);
      return newVersion;
    } catch (error) {
      this.logger.error(`Failed to import version: ${error.message}`);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  async validateVersion(version: string): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const versionData = await this.getVersion(version);
      if (!versionData) {
        return { isValid: false, errors: ['Version not found'] };
      }

      const errors: string[] = [];

      // Validate checksum
      const actualChecksum = this.calculateChecksum(versionData.configData);
      if (actualChecksum !== versionData.checksum) {
        errors.push('Checksum mismatch - data may be corrupted');
      }

      // Validate required fields
      if (!versionData.version) errors.push('Missing version');
      if (!versionData.timestamp) errors.push('Missing timestamp');
      if (!versionData.checksum) errors.push('Missing checksum');
      if (!versionData.environment) errors.push('Missing environment');

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
      };
    }
  }
}
