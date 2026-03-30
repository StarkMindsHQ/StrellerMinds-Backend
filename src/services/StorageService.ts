import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MultiCloudManager, CloudProvider, StorageConfig, StorageObject } from '../storage/MultiCloudManager';
import { StorageOptimizer, StorageTier, AccessPattern } from '../storage/StorageOptimizer';
import { DataCompressor, CompressionAlgorithm, CompressionOptions } from '../storage/DataCompressor';

export interface StorageServiceConfig {
  primaryProvider: CloudProvider;
  fallbackProviders: CloudProvider[];
  enableCompression: boolean;
  enableOptimization: boolean;
  enableRedundancy: boolean;
  defaultCompressionOptions: CompressionOptions;
}

export interface FileUploadOptions {
  compression?: boolean;
  optimization?: boolean;
  redundancy?: boolean;
  compressionAlgorithm?: CompressionAlgorithm;
  storageTier?: StorageTier;
  metadata?: Record<string, string>;
}

export interface FileUploadResult {
  key: string;
  url: string;
  size: number;
  compressedSize?: number;
  provider: CloudProvider;
  compressionResult?: any;
  optimizationResult?: any;
  uploadTime: number;
}

export interface FileDownloadResult {
  key: string;
  data: Buffer;
  size: number;
  originalSize?: number;
  provider: CloudProvider;
  decompressionTime?: number;
  downloadTime: number;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageConfigs: Map<CloudProvider, StorageConfig> = new Map();

  constructor(
    private readonly multiCloudManager: MultiCloudManager,
    private readonly storageOptimizer: StorageOptimizer,
    private readonly dataCompressor: DataCompressor,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeStorageConfigs();
    this.logger.log('StorageService initialized');
  }

  private async initializeStorageConfigs(): Promise<void> {
    const providers = [CloudProvider.AWS, CloudProvider.GCP, CloudProvider.AZURE];

    for (const provider of providers) {
      const config = this.getStorageConfig(provider);
      if (config) {
        this.storageConfigs.set(provider, config);
        this.logger.log(`Initialized ${provider} storage configuration`);
      }
    }
  }

  private getStorageConfig(provider: CloudProvider): StorageConfig | null {
    switch (provider) {
      case CloudProvider.AWS:
        return {
          provider,
          bucket: this.configService.get<string>('AWS_S3_BUCKET'),
          region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
          credentials: {
            accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
          },
        };
      case CloudProvider.GCP:
        return {
          provider,
          bucket: this.configService.get<string>('GCP_STORAGE_BUCKET'),
          credentials: {
            projectId: this.configService.get<string>('GCP_PROJECT_ID'),
            keyFilename: this.configService.get<string>('GCP_KEY_FILENAME'),
          },
        };
      case CloudProvider.AZURE:
        return {
          provider,
          bucket: this.configService.get<string>('AZURE_STORAGE_CONTAINER'),
          credentials: {
            connectionString: this.configService.get<string>('AZURE_CONNECTION_STRING'),
          },
        };
      default:
        return null;
    }
  }

  async uploadFile(
    key: string,
    data: Buffer,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult> {
    const startTime = Date.now();
    const primaryProvider = this.configService.get<CloudProvider>('PRIMARY_STORAGE_PROVIDER', CloudProvider.AWS);
    const primaryConfig = this.storageConfigs.get(primaryProvider);

    if (!primaryConfig) {
      throw new Error(`Primary storage provider ${primaryProvider} not configured`);
    }

    try {
      let processedData = data;
      let compressionResult;
      let optimizationResult;

      if (options.compression !== false) {
        const compressionOptions = {
          algorithm: options.compressionAlgorithm || CompressionAlgorithm.GZIP,
          level: 6,
          threshold: 1024,
        };
        
        const { compressedData, result } = await this.dataCompressor.compress(processedData, compressionOptions);
        processedData = compressedData;
        compressionResult = result;
      }

      if (options.optimization) {
        this.storageOptimizer.recordAccess(key, processedData.length);
        optimizationResult = await this.storageOptimizer.optimizeStorage();
      }

      const storageObject: StorageObject = {
        key,
        body: processedData,
        metadata: {
          ...options.metadata,
          originalSize: data.length.toString(),
          compressed: compressionResult ? 'true' : 'false',
          compressionAlgorithm: compressionResult?.algorithm,
          uploadedAt: new Date().toISOString(),
        },
      };

      const uploadResults = await this.multiCloudManager.upload(
        storageObject,
        primaryConfig,
        options.redundancy !== false
      );

      const uploadTime = Date.now() - startTime;
      const primaryResult = uploadResults[0];

      const result: FileUploadResult = {
        key,
        url: primaryResult.location || '',
        size: data.length,
        compressedSize: compressionResult?.compressedSize,
        provider: primaryResult.provider,
        compressionResult,
        optimizationResult,
        uploadTime,
      };

      this.logger.log(`Successfully uploaded ${key} (${data.length} bytes) to ${primaryProvider}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload ${key}:`, error);
      throw error;
    }
  }

  async downloadFile(key: string, provider?: CloudProvider): Promise<FileDownloadResult> {
    const startTime = Date.now();
    const targetProvider = provider || this.configService.get<CloudProvider>('PRIMARY_STORAGE_PROVIDER', CloudProvider.AWS);
    const config = this.storageConfigs.get(targetProvider);

    if (!config) {
      throw new Error(`Storage provider ${targetProvider} not configured`);
    }

    try {
      const downloadResult = await this.multiCloudManager.download(key, config);
      let decompressedData = downloadResult.body;
      let decompressionTime;

      if (downloadResult.metadata?.compressed === 'true') {
        const algorithm = downloadResult.metadata.compressionAlgorithm as CompressionAlgorithm;
        const startTime = Date.now();
        const { decompressedData: data } = await this.dataCompressor.decompress(decompressedData, algorithm);
        decompressedData = data;
        decompressionTime = Date.now() - startTime;
      }

      this.storageOptimizer.recordAccess(key, decompressedData.length);

      const downloadTime = Date.now() - startTime;

      const result: FileDownloadResult = {
        key,
        data: decompressedData,
        size: decompressedData.length,
        originalSize: downloadResult.metadata?.originalSize 
          ? parseInt(downloadResult.metadata.originalSize) 
          : undefined,
        provider: downloadResult.provider,
        decompressionTime,
        downloadTime,
      };

      this.logger.log(`Successfully downloaded ${key} (${decompressedData.length} bytes) from ${targetProvider}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to download ${key} from ${targetProvider}:`, error);

      if (!provider) {
        this.logger.log('Attempting failover download from alternative providers');
        return await this.failoverDownload(key);
      }

      throw error;
    }
  }

  private async failoverDownload(key: string): Promise<FileDownloadResult> {
    const fallbackProviders = this.getFallbackProviders();
    
    for (const provider of fallbackProviders) {
      try {
        this.logger.log(`Attempting failover download from ${provider}`);
        return await this.downloadFile(key, provider);
      } catch (error) {
        this.logger.warn(`Failover download failed from ${provider}:`, error);
      }
    }

    throw new Error(`All providers failed to download ${key}`);
  }

  private getFallbackProviders(): CloudProvider[] {
    const primary = this.configService.get<CloudProvider>('PRIMARY_STORAGE_PROVIDER', CloudProvider.AWS);
    return Array.from(this.storageConfigs.keys())
      .filter(provider => provider !== primary)
      .slice(0, 2);
  }

  async deleteFile(key: string, provider?: CloudProvider): Promise<void> {
    const targetProvider = provider || this.configService.get<CloudProvider>('PRIMARY_STORAGE_PROVIDER', CloudProvider.AWS);
    const config = this.storageConfigs.get(targetProvider);

    if (!config) {
      throw new Error(`Storage provider ${targetProvider} not configured`);
    }

    try {
      await this.multiCloudManager.delete(key, config);
      this.logger.log(`Successfully deleted ${key} from ${targetProvider}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${key} from ${targetProvider}:`, error);
      throw error;
    }
  }

  async listFiles(provider?: CloudProvider, prefix?: string): Promise<string[]> {
    const targetProvider = provider || this.configService.get<CloudProvider>('PRIMARY_STORAGE_PROVIDER', CloudProvider.AWS);
    const config = this.storageConfigs.get(targetProvider);

    if (!config) {
      throw new Error(`Storage provider ${targetProvider} not configured`);
    }

    try {
      const files = await this.multiCloudManager.listObjects(config, prefix);
      this.logger.log(`Listed ${files.length} files from ${targetProvider}`);
      return files;
    } catch (error) {
      this.logger.error(`Failed to list files from ${targetProvider}:`, error);
      throw error;
    }
  }

  async getStorageMetrics(): Promise<{
    totalSize: number;
    totalFiles: number;
    compressionMetrics: any;
    optimizationMetrics: any;
    providerMetrics: Record<CloudProvider, any>;
  }> {
    const compressionMetrics = this.dataCompressor.getMetrics();
    const optimizationMetrics = await this.storageOptimizer.getStorageMetrics();

    const providerMetrics: Record<CloudProvider, any> = {
      [CloudProvider.AWS]: {},
      [CloudProvider.GCP]: {},
      [CloudProvider.AZURE]: {},
    };
    for (const [provider] of this.storageConfigs) {
      try {
        const files = await this.listFiles(provider);
        providerMetrics[provider] = {
          fileCount: files.length,
          available: true,
        };
      } catch (error) {
        providerMetrics[provider] = {
          fileCount: 0,
          available: false,
          error: error.message,
        };
      }
    }

    return {
      totalSize: optimizationMetrics.totalSize,
      totalFiles: Object.values(providerMetrics).reduce((sum, metrics) => sum + metrics.fileCount, 0),
      compressionMetrics,
      optimizationMetrics,
      providerMetrics,
    };
  }

  async optimizeStorage(): Promise<{
    optimizedFiles: number;
    costSavings: number;
    performanceImpact: string;
  }> {
    const report = await this.storageOptimizer.getOptimizationReport();
    const impact = await this.storageOptimizer.simulateOptimizationImpact();

    if (impact.riskLevel === 'low') {
      await this.storageOptimizer.applyOptimizations(report.recommendations);
      this.logger.log(`Applied optimizations to ${report.recommendations.length} files`);
    } else {
      this.logger.warn(`Optimization risk level ${impact.riskLevel}, skipping automatic application`);
    }

    return {
      optimizedFiles: report.optimizedObjects,
      costSavings: report.potentialSavings,
      performanceImpact: impact.performanceImpact,
    };
  }

  async getStorageHealth(): Promise<Record<CloudProvider, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    error?: string;
  }>> {
    const healthStatus: Record<CloudProvider, any> = {
      [CloudProvider.AWS]: {},
      [CloudProvider.GCP]: {},
      [CloudProvider.AZURE]: {},
    };

    for (const [provider, config] of this.storageConfigs) {
      try {
        const startTime = Date.now();
        await this.multiCloudManager.listObjects(config);
        const responseTime = Date.now() - startTime;

        healthStatus[provider] = {
          status: responseTime < 1000 ? 'healthy' : responseTime < 5000 ? 'degraded' : 'unhealthy',
          responseTime,
        };
      } catch (error) {
        healthStatus[provider] = {
          status: 'unhealthy',
          responseTime: -1,
          error: error.message,
        };
      }
    }

    return healthStatus;
  }

  async benchmarkCompression(key: string, provider?: CloudProvider): Promise<{
    originalSize: number;
    compressionResults: Record<CompressionAlgorithm, any>;
    recommendation: CompressionAlgorithm;
  }> {
    const downloadResult = await this.downloadFile(key, provider);
    const compressionResults = await this.dataCompressor.benchmarkAlgorithms(downloadResult.data);
    
    let bestAlgorithm = CompressionAlgorithm.NONE;
    let bestRatio = 1;

    Object.entries(compressionResults).forEach(([algorithm, result]) => {
      if (result.compressionRatio < bestRatio) {
        bestRatio = result.compressionRatio;
        bestAlgorithm = algorithm as CompressionAlgorithm;
      }
    });

    return {
      originalSize: downloadResult.size,
      compressionResults,
      recommendation: bestAlgorithm,
    };
  }

  async getStorageConfig(): StorageServiceConfig {
    return {
      primaryProvider: this.configService.get<CloudProvider>('PRIMARY_STORAGE_PROVIDER', CloudProvider.AWS),
      fallbackProviders: this.getFallbackProviders(),
      enableCompression: this.configService.get<boolean>('ENABLE_COMPRESSION', true),
      enableOptimization: this.configService.get<boolean>('ENABLE_OPTIMIZATION', true),
      enableRedundancy: this.configService.get<boolean>('ENABLE_REDUNDANCY', false),
      defaultCompressionOptions: this.dataCompressor.getDefaultOptions(),
    };
  }
}
