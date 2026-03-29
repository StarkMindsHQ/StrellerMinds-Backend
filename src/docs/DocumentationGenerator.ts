import { Injectable, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export interface DocumentationMetadata {
  title: string;
  description: string;
  version: string;
  contactName?: string;
  contactEmail?: string;
  tags?: string[];
}

@Injectable()
export class DocumentationGenerator {
  private readonly logger = new Logger(DocumentationGenerator.name);

  /**
   * Generates a Swagger/OpenAPI document for the given metadata and app instance.
   */
  generateDocument(app: INestApplication, metadata: DocumentationMetadata): OpenAPIObject {
    this.logger.log(`Generating API documentation for ${metadata.title} v${metadata.version}`);

    const config = new DocumentBuilder()
      .setTitle(metadata.title)
      .setDescription(metadata.description)
      .setVersion(metadata.version)
      .setContact(
        metadata.contactName || 'StrellerMinds Documentation Support',
        'https://strellerminds.com/support',
        metadata.contactEmail || 'docs@strellerminds.com',
      );

    if (metadata.tags && metadata.tags.length > 0) {
      metadata.tags.forEach((tag) => config.addTag(tag));
    }

    // Add common authentication and versioning support
    config
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api_key');

    const document = SwaggerModule.createDocument(app, config.build());
    return document;
  }

  /**
   * Generates multiple versions of the documentation for version management.
   */
  generateVersionedDocs(app: INestApplication, versions: string[]): Record<string, OpenAPIObject> {
    const docs: Record<string, OpenAPIObject> = {};
    
    versions.forEach((version) => {
      docs[version] = this.generateDocument(app, {
        title: `StrellerMinds API v${version}`,
        description: `API Documentation for StrellerMinds version ${version}`,
        version: version,
      });
    });

    return docs;
  }
}
