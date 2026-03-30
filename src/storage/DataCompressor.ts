import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGzip, createGunzip, createDeflate, createInflate } from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream';

const pipelineAsync = promisify(pipeline);

export enum CompressionAlgorithm {
  GZIP = 'gzip',
  DEFLATE = 'deflate',
  BROTLI = 'brotli',
  LZ4 = 'lz4',
  NONE = 'none'
}

export interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  level?: number;
  threshold?: number;
  strategy?: 'default' | 'filtered' | 'huffman-only' | 'rle' | 'fixed';
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: CompressionAlgorithm;
  compressionTime: number;
}

export interface DecompressionResult {
  compressedSize: number;
  decompressedSize: number;
  algorithm: CompressionAlgorithm;
  decompressionTime: number;
}

export interface CompressionMetrics {
  totalCompressed: number;
  totalDecompressed: number;
  averageCompressionRatio: number;
  totalCompressionTime: number;
  totalDecompressionTime: number;
  algorithmUsage: Record<CompressionAlgorithm, number>;
}

@Injectable()
export class DataCompressor {
  private readonly logger = new Logger(DataCompressor.name);
  private readonly metrics: CompressionMetrics = {
    totalCompressed: 0,
    totalDecompressed: 0,
    averageCompressionRatio: 0,
    totalCompressionTime: 0,
    totalDecompressionTime: 0,
    algorithmUsage: {} as Record<CompressionAlgorithm, number>,
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    Object.values(CompressionAlgorithm).forEach(algorithm => {
      this.metrics.algorithmUsage[algorithm] = 0;
    });
  }

  async compress(
    data: Buffer,
    options: CompressionOptions = { algorithm: CompressionAlgorithm.GZIP }
  ): Promise<{ compressedData: Buffer; result: CompressionResult }> {
    const startTime = Date.now();
    const originalSize = data.length;

    if (options.threshold && originalSize < options.threshold) {
      return {
        compressedData: data,
        result: {
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          algorithm: CompressionAlgorithm.NONE,
          compressionTime: 0,
        },
      };
    }

    try {
      let compressedData: Buffer;

      switch (options.algorithm) {
        case CompressionAlgorithm.GZIP:
          compressedData = await this.compressGzip(data, options.level);
          break;
        case CompressionAlgorithm.DEFLATE:
          compressedData = await this.compressDeflate(data, options.level);
          break;
        case CompressionAlgorithm.BROTLI:
          compressedData = await this.compressBrotli(data, options.level);
          break;
        case CompressionAlgorithm.LZ4:
          compressedData = await this.compressLZ4(data, options.level);
          break;
        case CompressionAlgorithm.NONE:
        default:
          compressedData = data;
          break;
      }

      const compressionTime = Date.now() - startTime;
      const compressedSize = compressedData.length;
      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

      const result: CompressionResult = {
        originalSize,
        compressedSize,
        compressionRatio,
        algorithm: options.algorithm,
        compressionTime,
      };

      this.updateCompressionMetrics(result);
      this.logger.debug(`Compressed ${originalSize} bytes to ${compressedSize} bytes using ${options.algorithm}`);

      return { compressedData, result };
    } catch (error) {
      this.logger.error(`Compression failed with ${options.algorithm}:`, error);
      throw error;
    }
  }

  private async compressGzip(data: Buffer, level: number = 6): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const gzip = createGzip({ level });
      const chunks: Buffer[] = [];
      
      gzip.on('data', (chunk) => chunks.push(chunk));
      gzip.on('end', () => resolve(Buffer.concat(chunks)));
      gzip.on('error', reject);
      
      gzip.end(data);
    });
  }

  private async compressDeflate(data: Buffer, level: number = 6): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const deflate = createDeflate({ level });
      const chunks: Buffer[] = [];
      
      deflate.on('data', (chunk) => chunks.push(chunk));
      deflate.on('end', () => resolve(Buffer.concat(chunks)));
      deflate.on('error', reject);
      
      deflate.end(data);
    });
  }

  private async compressBrotli(data: Buffer, level: number = 6): Promise<Buffer> {
    try {
      const { constants, createBrotliCompress } = await import('zlib');
      const brotli = createBrotliCompress({
        params: {
          [constants.BROTLI_PARAM_QUALITY]: level,
        },
      });

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        brotli.on('data', (chunk) => chunks.push(chunk));
        brotli.on('end', () => resolve(Buffer.concat(chunks)));
        brotli.on('error', reject);
        
        brotli.end(data);
      });
    } catch (error) {
      this.logger.warn('Brotli compression not available, falling back to gzip');
      return this.compressGzip(data, level);
    }
  }

  private async compressLZ4(data: Buffer, level: number = 6): Promise<Buffer> {
    try {
      const LZ4 = await import('lz4');
      return LZ4.encode(data, { highCompression: level > 6 });
    } catch (error) {
      this.logger.warn('LZ4 compression not available, falling back to gzip');
      return this.compressGzip(data, level);
    }
  }

  async decompress(
    compressedData: Buffer,
    algorithm: CompressionAlgorithm
  ): Promise<{ decompressedData: Buffer; result: DecompressionResult }> {
    const startTime = Date.now();
    const compressedSize = compressedData.length;

    try {
      let decompressedData: Buffer;

      switch (algorithm) {
        case CompressionAlgorithm.GZIP:
          decompressedData = await this.decompressGzip(compressedData);
          break;
        case CompressionAlgorithm.DEFLATE:
          decompressedData = await this.decompressDeflate(compressedData);
          break;
        case CompressionAlgorithm.BROTLI:
          decompressedData = await this.decompressBrotli(compressedData);
          break;
        case CompressionAlgorithm.LZ4:
          decompressedData = await this.decompressLZ4(compressedData);
          break;
        case CompressionAlgorithm.NONE:
        default:
          decompressedData = compressedData;
          break;
      }

      const decompressionTime = Date.now() - startTime;
      const decompressedSize = decompressedData.length;

      const result: DecompressionResult = {
        compressedSize,
        decompressedSize,
        algorithm,
        decompressionTime,
      };

      this.updateDecompressionMetrics(result);
      this.logger.debug(`Decompressed ${compressedSize} bytes to ${decompressedSize} bytes using ${algorithm}`);

      return { decompressedData, result };
    } catch (error) {
      this.logger.error(`Decompression failed with ${algorithm}:`, error);
      throw error;
    }
  }

  private async decompressGzip(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const gunzip = createGunzip();
      const chunks: Buffer[] = [];
      
      gunzip.on('data', (chunk) => chunks.push(chunk));
      gunzip.on('end', () => resolve(Buffer.concat(chunks)));
      gunzip.on('error', reject);
      
      gunzip.end(data);
    });
  }

  private async decompressDeflate(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const inflate = createInflate();
      const chunks: Buffer[] = [];
      
      inflate.on('data', (chunk) => chunks.push(chunk));
      inflate.on('end', () => resolve(Buffer.concat(chunks)));
      inflate.on('error', reject);
      
      inflate.end(data);
    });
  }

  private async decompressBrotli(data: Buffer): Promise<Buffer> {
    try {
      const { createBrotliDecompress } = await import('zlib');
      const brotli = createBrotliDecompress();

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        brotli.on('data', (chunk) => chunks.push(chunk));
        brotli.on('end', () => resolve(Buffer.concat(chunks)));
        brotli.on('error', reject);
        
        brotli.end(data);
      });
    } catch (error) {
      this.logger.warn('Brotli decompression not available, attempting gzip');
      return this.decompressGzip(data);
    }
  }

  private async decompressLZ4(data: Buffer): Promise<Buffer> {
    try {
      const LZ4 = await import('lz4');
      return LZ4.decode(data);
    } catch (error) {
      this.logger.warn('LZ4 decompression not available, attempting gzip');
      return this.decompressGzip(data);
    }
  }

  async findBestCompression(data: Buffer): Promise<{
    algorithm: CompressionAlgorithm;
    result: CompressionResult;
    compressedData: Buffer;
  }> {
    const algorithms = [
      CompressionAlgorithm.GZIP,
      CompressionAlgorithm.DEFLATE,
      CompressionAlgorithm.BROTLI,
      CompressionAlgorithm.LZ4,
    ];

    let bestResult: {
      algorithm: CompressionAlgorithm;
      result: CompressionResult;
      compressedData: Buffer;
    } | null = null;

    for (const algorithm of algorithms) {
      try {
        const { compressedData, result } = await this.compress(data, { algorithm });
        
        if (!bestResult || result.compressionRatio < bestResult.result.compressionRatio) {
          bestResult = { algorithm, result, compressedData };
        }
      } catch (error) {
        this.logger.warn(`Failed to test ${algorithm} algorithm:`, error);
      }
    }

    if (!bestResult) {
      throw new Error('No compression algorithm succeeded');
    }

    this.logger.log(`Best compression algorithm: ${bestResult.algorithm} with ratio ${bestResult.result.compressionRatio}`);
    return bestResult;
  }

  async benchmarkAlgorithms(data: Buffer): Promise<Record<CompressionAlgorithm, CompressionResult>> {
    const algorithms = [
      CompressionAlgorithm.GZIP,
      CompressionAlgorithm.DEFLATE,
      CompressionAlgorithm.BROTLI,
      CompressionAlgorithm.LZ4,
      CompressionAlgorithm.NONE,
    ];

    const results: Record<CompressionAlgorithm, CompressionResult> = {} as any;

    for (const algorithm of algorithms) {
      try {
        const { result } = await this.compress(data, { algorithm });
        results[algorithm] = result;
      } catch (error) {
        this.logger.warn(`Benchmark failed for ${algorithm}:`, error);
        results[algorithm] = {
          originalSize: data.length,
          compressedSize: data.length,
          compressionRatio: 1,
          algorithm,
          compressionTime: 0,
        };
      }
    }

    return results;
  }

  private updateCompressionMetrics(result: CompressionResult): void {
    this.metrics.totalCompressed++;
    this.metrics.totalCompressionTime += result.compressionTime;
    this.metrics.algorithmUsage[result.algorithm]++;

    const totalRatio = this.metrics.averageCompressionRatio * (this.metrics.totalCompressed - 1) + result.compressionRatio;
    this.metrics.averageCompressionRatio = totalRatio / this.metrics.totalCompressed;
  }

  private updateDecompressionMetrics(result: DecompressionResult): void {
    this.metrics.totalDecompressed++;
    this.metrics.totalDecompressionTime += result.decompressionTime;
  }

  getMetrics(): CompressionMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics.totalCompressed = 0;
    this.metrics.totalDecompressed = 0;
    this.metrics.averageCompressionRatio = 0;
    this.metrics.totalCompressionTime = 0;
    this.metrics.totalDecompressionTime = 0;
    Object.keys(this.metrics.algorithmUsage).forEach(algorithm => {
      this.metrics.algorithmUsage[algorithm as CompressionAlgorithm] = 0;
    });
    this.logger.log('Compression metrics reset');
  }

  getDefaultOptions(): CompressionOptions {
    return {
      algorithm: this.configService.get<CompressionAlgorithm>('DEFAULT_COMPRESSION_ALGORITHM', CompressionAlgorithm.GZIP),
      level: this.configService.get<number>('DEFAULT_COMPRESSION_LEVEL', 6),
      threshold: this.configService.get<number>('COMPRESSION_THRESHOLD', 1024),
    };
  }

  async compressWithAutoSelection(
    data: Buffer,
    customOptions?: Partial<CompressionOptions>
  ): Promise<{ compressedData: Buffer; result: CompressionResult }> {
    const defaultOptions = this.getDefaultOptions();
    const options = { ...defaultOptions, ...customOptions };

    if (options.algorithm === CompressionAlgorithm.NONE) {
      const bestResult = await this.findBestCompression(data);
      return {
        compressedData: bestResult.compressedData,
        result: bestResult.result,
      };
    }

    return this.compress(data, options);
  }

  async batchCompress(
    dataArray: Buffer[],
    options?: CompressionOptions
  ): Promise<Array<{ compressedData: Buffer; result: CompressionResult }>> {
    const results = [];

    for (let i = 0; i < dataArray.length; i++) {
      try {
        const result = await this.compress(dataArray[i], options);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to compress batch item ${i}:`, error);
        results.push({
          compressedData: dataArray[i],
          result: {
            originalSize: dataArray[i].length,
            compressedSize: dataArray[i].length,
            compressionRatio: 1,
            algorithm: CompressionAlgorithm.NONE,
            compressionTime: 0,
          },
        });
      }
    }

    return results;
  }

  async estimateCompressionSavings(data: Buffer): Promise<{
    estimatedSavings: number;
    recommendedAlgorithm: CompressionAlgorithm;
    estimatedTime: number;
  }> {
    const sampleSize = Math.min(data.length, 1024 * 1024);
    const sample = data.slice(0, sampleSize);
    
    const bestResult = await this.findBestCompression(sample);
    const compressionRatio = bestResult.result.compressionRatio;
    
    const estimatedSavings = data.length * (1 - compressionRatio);
    const estimatedTime = (bestResult.result.compressionTime / sampleSize) * data.length;

    return {
      estimatedSavings,
      recommendedAlgorithm: bestResult.algorithm,
      estimatedTime,
    };
  }
}
