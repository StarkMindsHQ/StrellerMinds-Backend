import { Injectable, Logger, INestApplication } from '@nestjs/common';
import { DocumentationGenerator, DocumentationMetadata } from '../docs/DocumentationGenerator';
import { InteractiveTester, TestResult } from '../docs/InteractiveTester';
import { ExampleGenerator, CodeExample } from '../docs/ExampleGenerator';
import { OpenAPIObject } from '@nestjs/swagger';

@Injectable()
export class DocumentationService {
  private readonly logger = new Logger(DocumentationService.name);
  private documentationMap: Map<string, OpenAPIObject> = new Map();
  private analyticsData: Map<string, number> = new Map();

  constructor(
    private readonly docGenerator: DocumentationGenerator,
    private readonly interactiveTester: InteractiveTester,
    private readonly exampleGenerator: ExampleGenerator,
  ) {}

  /**
   * Generates and stores API documentation for one or more versions.
   */
  async initializeDocumentation(app: INestApplication, versions: string[]): Promise<void> {
    this.logger.log(`Initializing API documentation for ${versions.length} versions`);

    versions.forEach((version) => {
      const doc = this.docGenerator.generateDocument(app, {
        title: `StrellerMinds API v${version}`,
        description: `API Documentation for StrellerMinds version ${version}`,
        version: version,
        tags: ['Users', 'Courses', 'Blockchain', 'Payments'],
      });
      
      this.documentationMap.set(version, doc);
      this.analyticsData.set(version, 0);
    });
  }

  /**
   * Retrieves documentation for a specific API version and tracks access analytics.
   */
  getDocumentation(version: string): OpenAPIObject {
    this.logger.log(`Fetching documentation for version ${version}`);

    if (!this.documentationMap.has(version)) {
      throw new Error(`Documentation for version ${version} not found`);
    }

    // Increment analytics data for document access
    const currentCount = this.analyticsData.get(version) || 0;
    this.analyticsData.set(version, currentCount + 1);

    return this.documentationMap.get(version);
  }

  /**
   * Generates interactive test results for a given API endpoint.
   */
  async runInteractiveTest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any,
  ): Promise<TestResult> {
    return this.interactiveTester.testEndpoint(method, url, headers, body);
  }

  /**
   * Generates multi-language code examples for an API endpoint.
   */
  getCodeExamples(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any,
  ): CodeExample[] {
    return this.exampleGenerator.generateExamples(method, url, headers, body);
  }

  /**
   * Retrieves comprehensive documentation analytics.
   */
  getAnalyticsReport(): Record<string, number> {
    const report: Record<string, number> = {};
    this.analyticsData.forEach((count, version) => {
      report[version] = count;
    });
    return report;
  }
}
