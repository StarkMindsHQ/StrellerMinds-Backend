import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ApiKey } from './entities/api-key.entity';
import { ApiUsage } from './entities/api-usage.entity';
import { ApiVersion } from './entities/api-version.entity';
import { ApiEndpoint } from './entities/api-endpoint.entity';
import { SdkDownload } from './entities/sdk-download.entity';
import { ApiKeyService } from './services/api-key.service';
import { SdkGeneratorService } from './services/sdk-generator.service';
import { ApiAnalyticsService } from './services/api-analytics.service';
import { ApiVersioningService } from './services/api-versioning.service';
import { ApiVersionGuard } from './guards/api-version.guard';
import { ApiExplorerService } from './services/api-explorer.service';
import { ApiTestingService } from './services/api-testing.service';
import { DocumentationController } from './controllers/documentation.controller';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiUsageInterceptor } from './interceptors/api-usage.interceptor';
import { User } from '../auth/entities/user.entity';
import { DocumentationGenerator } from '../docs/DocumentationGenerator';
import { InteractiveTester } from '../docs/InteractiveTester';
import { ExampleGenerator } from '../docs/ExampleGenerator';
import { DocumentationService } from '../services/DocumentationService';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey, ApiUsage, ApiVersion, ApiEndpoint, SdkDownload, User]),
    HttpModule,
  ],
  controllers: [DocumentationController],
  providers: [
    ApiKeyService,
    SdkGeneratorService,
    ApiAnalyticsService,
    ApiVersioningService,
    ApiExplorerService,
    ApiTestingService,
    ApiKeyGuard,
    ApiUsageInterceptor,
    ApiVersionGuard,
    DocumentationGenerator,
    InteractiveTester,
    ExampleGenerator,
    DocumentationService,
  ],
  exports: [
    ApiKeyService,
    SdkGeneratorService,
    ApiAnalyticsService,
    ApiVersioningService,
    ApiExplorerService,
    ApiTestingService,
    ApiKeyGuard,
    ApiUsageInterceptor,
    DocumentationService,
  ],
})
export class DocumentationModule {}
