import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface TestDataVersion {
  version: string;
  description: string;
  createdAt: Date;
  schema: {
    entities: string[];
    relationships: string[];
  };
  migrations: string[];
  dataSets: string[];
}

export interface VersionDiff {
  added: string[];
  removed: string[];
  modified: string[];
  schemaChanges: string[];
}

@Injectable()
export class TestDataVersioningService {
  private readonly logger = new Logger(TestDataVersioningService.name);
  private readonly versionsPath = join(process.cwd(), 'test-data', 'versions');
  private currentVersion: TestDataVersion | null = null;

  constructor() {
    this.ensureVersionsDirectory();
  }

  /**
   * Ensure versions directory exists
   */
  private async ensureVersionsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.versionsPath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create versions directory:', error);
    }
  }

  /**
   * Create a new test data version
   */
  async createVersion(
    version: string,
    description: string,
    options: {
      schema?: { entities: string[]; relationships: string[] };
      migrations?: string[];
      dataSets?: string[];
    } = {},
  ): Promise<TestDataVersion> {
    this.logger.log(`Creating test data version: ${version}`);

    const newVersion: TestDataVersion = {
      version,
      description,
      createdAt: new Date(),
      schema: options.schema || { entities: [], relationships: [] },
      migrations: options.migrations || [],
      dataSets: options.dataSets || [],
    };

    // Save version to file
    const versionPath = join(this.versionsPath, `${version}.json`);
    await fs.writeFile(versionPath, JSON.stringify(newVersion, null, 2));

    this.currentVersion = newVersion;
    this.logger.log(`Test data version ${version} created successfully`);

    return newVersion;
  }

  /**
   * Load a specific version
   */
  async loadVersion(version: string): Promise<TestDataVersion> {
    const versionPath = join(this.versionsPath, `${version}.json`);
    
    try {
      const versionData = await fs.readFile(versionPath, 'utf-8');
      const loadedVersion: TestDataVersion = JSON.parse(versionData);
      
      this.currentVersion = loadedVersion;
      this.logger.log(`Loaded test data version: ${version}`);
      
      return loadedVersion;
    } catch (error) {
      this.logger.error(`Failed to load version ${version}:`, error);
      throw new Error(`Version ${version} not found`);
    }
  }

  /**
   * Get current version
   */
  getCurrentVersion(): TestDataVersion | null {
    return this.currentVersion;
  }

  /**
   * List all available versions
   */
  async listVersions(): Promise<TestDataVersion[]> {
    try {
      const files = await fs.readdir(this.versionsPath);
      const versionFiles = files.filter(file => file.endsWith('.json'));
      
      const versions: TestDataVersion[] = [];
      
      for (const file of versionFiles) {
        try {
          const versionData = await fs.readFile(join(this.versionsPath, file), 'utf-8');
          const version: TestDataVersion = JSON.parse(versionData);
          versions.push(version);
        } catch (error) {
          this.logger.warn(`Failed to load version file ${file}:`, error);
        }
      }
      
      return versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      this.logger.error('Failed to list versions:', error);
      return [];
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    version1: string,
    version2: string,
  ): Promise<VersionDiff> {
    const v1 = await this.loadVersion(version1);
    const v2 = await this.loadVersion(version2);

    const diff: VersionDiff = {
      added: [],
      removed: [],
      modified: [],
      schemaChanges: [],
    };

    // Compare entities
    const v1Entities = new Set(v1.schema.entities);
    const v2Entities = new Set(v2.schema.entities);

    diff.added = Array.from(v2Entities).filter(entity => !v1Entities.has(entity));
    diff.removed = Array.from(v1Entities).filter(entity => !v2Entities.has(entity));

    // Compare relationships
    const v1Relationships = new Set(v1.schema.relationships);
    const v2Relationships = new Set(v2.schema.relationships);

    const addedRelationships = Array.from(v2Relationships).filter(rel => !v1Relationships.has(rel));
    const removedRelationships = Array.from(v1Relationships).filter(rel => !v2Relationships.has(rel));

    diff.schemaChanges = [...addedRelationships, ...removedRelationships];

    // Identify modified entities (simplified - in real implementation would compare schemas)
    const commonEntities = Array.from(v1Entities).filter(entity => v2Entities.has(entity));
    diff.modified = commonEntities; // Assume all common entities might be modified

    return diff;
  }

  /**
   * Delete a version
   */
  async deleteVersion(version: string): Promise<boolean> {
    const versionPath = join(this.versionsPath, `${version}.json`);
    
    try {
      await fs.unlink(versionPath);
      this.logger.log(`Deleted test data version: ${version}`);
      
      if (this.currentVersion?.version === version) {
        this.currentVersion = null;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete version ${version}:`, error);
      return false;
    }
  }

  /**
   * Tag current version with a label
   */
  async tagVersion(version: string, tag: string): Promise<void> {
    const versionPath = join(this.versionsPath, `${version}.json`);
    const tagPath = join(this.versionsPath, `${tag}.tag.json`);
    
    try {
      const versionData = await fs.readFile(versionPath, 'utf-8');
      await fs.writeFile(tagPath, versionData);
      
      this.logger.log(`Tagged version ${version} as ${tag}`);
    } catch (error) {
      this.logger.error(`Failed to tag version ${version} as ${tag}:`, error);
      throw error;
    }
  }

  /**
   * Load version by tag
   */
  async loadVersionByTag(tag: string): Promise<TestDataVersion> {
    const tagPath = join(this.versionsPath, `${tag}.tag.json`);
    
    try {
      const tagData = await fs.readFile(tagPath, 'utf-8');
      const version: TestDataVersion = JSON.parse(tagData);
      
      this.currentVersion = version;
      this.logger.log(`Loaded test data version by tag: ${tag}`);
      
      return version;
    } catch (error) {
      this.logger.error(`Failed to load version by tag ${tag}:`, error);
      throw new Error(`Tag ${tag} not found`);
    }
  }

  /**
   * Get version history with changes
   */
  async getVersionHistory(): Promise<Array<{
    version: TestDataVersion;
    changes?: VersionDiff;
  }>> {
    const versions = await this.listVersions();
    const history = [];

    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      let changes: VersionDiff | undefined;

      if (i < versions.length - 1) {
        const nextVersion = versions[i + 1];
        changes = await this.compareVersions(nextVersion.version, version.version);
      }

      history.push({ version, changes });
    }

    return history;
  }

  /**
   * Validate version integrity
   */
  async validateVersion(version: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let valid = true;

    try {
      const v = await this.loadVersion(version);

      // Check required fields
      if (!v.version) {
        issues.push('Version number is missing');
        valid = false;
      }

      if (!v.description) {
        issues.push('Description is missing');
        valid = false;
      }

      if (!v.createdAt) {
        issues.push('Creation date is missing');
        valid = false;
      }

      if (!v.schema || !Array.isArray(v.schema.entities)) {
        issues.push('Schema entities are missing or invalid');
        valid = false;
      }

      // Check for duplicate entities
      const entitySet = new Set(v.schema.entities);
      if (entitySet.size !== v.schema.entities.length) {
        issues.push('Duplicate entities found in schema');
        valid = false;
      }

    } catch (error) {
      issues.push(`Failed to load version: ${error.message}`);
      valid = false;
    }

    return { valid, issues };
  }

  /**
   * Export version as migration script
   */
  async exportAsMigration(version: string): Promise<string> {
    const v = await this.loadVersion(version);
    
    const migration = `
-- Test Data Migration: ${v.version}
-- Description: ${v.description}
-- Created: ${v.createdAt.toISOString()}

BEGIN;

-- Add new entities
${v.schema.entities.map(entity => `-- Entity: ${entity}`).join('\n')}

-- Apply relationships
${v.schema.relationships.map(relationship => `-- Relationship: ${relationship}`).join('\n')}

-- Insert test data sets
${v.dataSets.map(dataSet => `-- Data Set: ${dataSet}`).join('\n')}

COMMIT;
`;

    return migration;
  }
}
