import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiVersion, VersionStatus } from '../entities/api-version.entity';
import { ApiEndpoint, EndpointStatus } from '../entities/api-endpoint.entity';

@Injectable()
export class ApiVersioningService {
  private readonly logger = new Logger(ApiVersioningService.name);

  constructor(
    @InjectRepository(ApiVersion)
    private versionRepository: Repository<ApiVersion>,
    @InjectRepository(ApiEndpoint)
    private endpointRepository: Repository<ApiEndpoint>,
  ) {}

  /**
   * Get current API version
   */
  async getCurrentVersion(): Promise<ApiVersion | null> {
    return this.versionRepository.findOne({
      where: { isDefault: true, status: VersionStatus.ACTIVE },
    });
  }

  /**
   * Get all versions
   */
  async getAllVersions(): Promise<ApiVersion[]> {
    return this.versionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get version by ID
   */
  async getVersion(id: string): Promise<ApiVersion | null> {
    return this.versionRepository.findOne({
      where: { id },
      relations: ['endpoints'],
    });
  }

  /**
   * Create new version
   */
  async createVersion(
    version: string,
    releaseNotes?: string,
    breakingChanges?: Array<{ endpoint: string; description: string; migration: string }>,
  ): Promise<ApiVersion> {
    // Set previous default to false
    await this.versionRepository.update({ isDefault: true }, { isDefault: false });

    const newVersion = this.versionRepository.create({
      version,
      status: VersionStatus.ACTIVE,
      isDefault: true,
      releaseNotes,
      breakingChanges,
      releaseDate: new Date(),
    });

    return this.versionRepository.save(newVersion);
  }

  /**
   * Deprecate version
   */
  async deprecateVersion(versionId: string, deprecationDate: Date, sunsetDate: Date): Promise<void> {
    const version = await this.versionRepository.findOne({ where: { id: versionId } });
    if (!version) {
      throw new Error('Version not found');
    }

    version.status = VersionStatus.DEPRECATED;
    version.deprecationDate = deprecationDate;
    version.sunsetDate = sunsetDate;

    await this.versionRepository.save(version);

    // Deprecate all endpoints in this version
    await this.endpointRepository.update(
      { versionId },
      {
        status: EndpointStatus.DEPRECATED,
        deprecationDate,
      },
    );
  }

  /**
   * Register endpoint
   */
  async registerEndpoint(
    versionId: string,
    path: string,
    method: string,
    summary: string,
    options?: {
      description?: string;
      tags?: string[];
      parameters?: any[];
      requestBody?: any;
      responses?: any;
      codeExamples?: any;
      rateLimit?: any;
      authentication?: string[];
    },
  ): Promise<ApiEndpoint> {
    const endpoint = this.endpointRepository.create({
      versionId,
      path,
      method: method as any,
      summary,
      description: options?.description,
      tags: options?.tags,
      parameters: options?.parameters,
      requestBody: options?.requestBody,
      responses: options?.responses,
      codeExamples: options?.codeExamples,
      rateLimit: options?.rateLimit,
      authentication: options?.authentication,
      status: EndpointStatus.ACTIVE,
    });

    return this.endpointRepository.save(endpoint);
  }

  /**
   * Deprecate endpoint
   */
  async deprecateEndpoint(
    endpointId: string,
    deprecationNotice: string,
    migrationPath?: string,
  ): Promise<void> {
    const endpoint = await this.endpointRepository.findOne({ where: { id: endpointId } });
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    endpoint.status = EndpointStatus.DEPRECATED;
    endpoint.deprecationDate = new Date();
    endpoint.deprecationNotice = deprecationNotice;
    endpoint.migrationPath = migrationPath;

    await this.endpointRepository.save(endpoint);
  }

  /**
   * Get deprecated endpoints
   */
  async getDeprecatedEndpoints(versionId?: string): Promise<ApiEndpoint[]> {
    const where: any = { status: EndpointStatus.DEPRECATED };
    if (versionId) where.versionId = versionId;

    return this.endpointRepository.find({
      where,
      relations: ['version'],
      order: { deprecationDate: 'DESC' },
    });
  }

  /**
   * Generate migration guide
   */
  async generateMigrationGuide(fromVersion: string, toVersion: string): Promise<string> {
    const from = await this.versionRepository.findOne({ where: { version: fromVersion } });
    const to = await this.versionRepository.findOne({ where: { version: toVersion } });

    if (!from || !to) {
      throw new Error('Version not found');
    }

    const fromEndpoints = await this.endpointRepository.find({ where: { versionId: from.id } });
    const toEndpoints = await this.endpointRepository.find({ where: { versionId: to.id } });

    let guide = `# Migration Guide: ${fromVersion} → ${toVersion}\n\n`;
    guide += `## Overview\n\n`;
    guide += `This guide helps you migrate from API version ${fromVersion} to ${toVersion}.\n\n`;

    if (to.breakingChanges && to.breakingChanges.length > 0) {
      guide += `## Breaking Changes\n\n`;
      to.breakingChanges.forEach((change) => {
        guide += `### ${change.endpoint}\n`;
        guide += `${change.description}\n\n`;
        guide += `**Migration:**\n\`\`\`\n${change.migration}\n\`\`\`\n\n`;
      });
    }

    // Find removed endpoints
    const fromPaths = new Set(fromEndpoints.map((e) => `${e.method} ${e.path}`));
    const toPaths = new Set(toEndpoints.map((e) => `${e.method} ${e.path}`));
    const removed = Array.from(fromPaths).filter((p) => !toPaths.has(p));

    if (removed.length > 0) {
      guide += `## Removed Endpoints\n\n`;
      removed.forEach((path) => {
        guide += `- \`${path}\`\n`;
      });
      guide += `\n`;
    }

    // Find new endpoints
    const added = Array.from(toPaths).filter((p) => !fromPaths.has(p));
    if (added.length > 0) {
      guide += `## New Endpoints\n\n`;
      added.forEach((path) => {
        guide += `- \`${path}\`\n`;
      });
      guide += `\n`;
    }

    return guide;
  }
}
