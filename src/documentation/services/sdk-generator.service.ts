import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SdkDownload, SdkLanguage, SdkStatus } from '../entities/sdk-download.entity';
import { GenerateSdkDto, SdkDownloadResponseDto } from '../dto/sdk.dto';
import { SwaggerModule } from '@nestjs/swagger';
import { NestApplication } from '@nestjs/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';

@Injectable()
export class SdkGeneratorService {
  private readonly logger = new Logger(SdkGeneratorService.name);
  private readonly sdkOutputDir = path.join(process.cwd(), 'generated-sdks');

  constructor(
    @InjectRepository(SdkDownload)
    private sdkRepository: Repository<SdkDownload>,
  ) {
    this.ensureOutputDirectory();
  }

  /**
   * Generate SDK for a specific language
   */
  async generateSdk(
    app: NestApplication,
    language: SdkLanguage,
    version: string = 'v1',
    userId?: string,
  ): Promise<SdkDownloadResponseDto> {
    this.logger.log(`Generating ${language} SDK for version ${version}`);

    // Create SDK record
    const sdkRecord = this.sdkRepository.create({
      language,
      version,
      status: SdkStatus.GENERATING,
      userId,
    });
    await this.sdkRepository.save(sdkRecord);

    try {
      // Get OpenAPI spec
      const document = SwaggerModule.createDocument(app, {} as any);
      const openApiSpec = JSON.stringify(document, null, 2);

      // Generate SDK based on language
      let sdkCode: string;
      let packageName: string;

      switch (language) {
        case SdkLanguage.TYPESCRIPT:
          ({ code: sdkCode, packageName } = this.generateTypeScriptSdk(openApiSpec, version));
          break;
        case SdkLanguage.JAVASCRIPT:
          ({ code: sdkCode, packageName } = this.generateJavaScriptSdk(openApiSpec, version));
          break;
        case SdkLanguage.PYTHON:
          ({ code: sdkCode, packageName } = this.generatePythonSdk(openApiSpec, version));
          break;
        case SdkLanguage.JAVA:
          ({ code: sdkCode, packageName } = this.generateJavaSdk(openApiSpec, version));
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      // Save SDK files
      const sdkDir = path.join(this.sdkOutputDir, `${language}-${version}-${sdkRecord.id}`);
      await fs.mkdir(sdkDir, { recursive: true });

      // Write main SDK file
      const mainFile = this.getMainFileName(language);
      await fs.writeFile(path.join(sdkDir, mainFile), sdkCode);

      // Write package.json/requirements.txt/etc
      await this.writePackageFiles(sdkDir, language, packageName, version);

      // Create zip archive
      const zipPath = path.join(this.sdkOutputDir, `${language}-${version}-${sdkRecord.id}.zip`);
      await this.createZipArchive(sdkDir, zipPath);

      // Update record
      const stats = await fs.stat(zipPath);
      sdkRecord.status = SdkStatus.READY;
      sdkRecord.downloadUrl = `/api/documentation/sdks/${sdkRecord.id}/download`;
      sdkRecord.filePath = zipPath;
      sdkRecord.fileSize = stats.size;
      sdkRecord.generatedAt = new Date();
      sdkRecord.metadata = {
        packageName,
        repositoryUrl: `https://github.com/strellerminds/sdk-${language}`,
        documentationUrl: `https://docs.strellerminds.com/sdks/${language}`,
      };

      await this.sdkRepository.save(sdkRecord);

      this.logger.log(`SDK generated successfully: ${language} ${version}`);

      return this.toResponseDto(sdkRecord);
    } catch (error) {
      this.logger.error(`Failed to generate SDK: ${error.message}`);
      sdkRecord.status = SdkStatus.FAILED;
      sdkRecord.errorMessage = error.message;
      await this.sdkRepository.save(sdkRecord);
      throw error;
    }
  }

  /**
   * Generate TypeScript SDK
   */
  private generateTypeScriptSdk(openApiSpec: string, version: string): { code: string; packageName: string } {
    const packageName = `@strellerminds/api-client`;
    const spec = JSON.parse(openApiSpec);

    let code = `// StrellerMinds API Client - TypeScript SDK\n`;
    code += `// Version: ${version}\n`;
    code += `// Generated: ${new Date().toISOString()}\n\n`;

    code += `export interface ApiResponse<T> {\n`;
    code += `  success: boolean;\n`;
    code += `  data: T;\n`;
    code += `  message?: string;\n`;
    code += `  timestamp: string;\n`;
    code += `}\n\n`;

    code += `export class StrellerMindsClient {\n`;
    code += `  private baseUrl: string;\n`;
    code += `  private apiKey?: string;\n\n`;

    code += `  constructor(baseUrl: string = 'https://api.strellerminds.com', apiKey?: string) {\n`;
    code += `    this.baseUrl = baseUrl;\n`;
    code += `    this.apiKey = apiKey;\n`;
    code += `  }\n\n`;

    // Generate methods for each endpoint
    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(methods as any)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
            const op = operation as any;
            const operationId = op.operationId || this.generateOperationId(path, method);
            const methodName = this.toCamelCase(operationId);

            code += `  async ${methodName}(`;
            if (op.parameters) {
              code += op.parameters
                .map((p: any) => `${p.name}${p.required ? '' : '?'}: ${this.getTypeScriptType(p.schema)}`)
                .join(', ');
            }
            code += `): Promise<ApiResponse<any>> {\n`;
            code += `    const response = await fetch(\`\${this.baseUrl}${path}\`, {\n`;
            code += `      method: '${method.toUpperCase()}',\n`;
            code += `      headers: {\n`;
            code += `        'Content-Type': 'application/json',\n`;
            code += `        ...(this.apiKey && { 'X-API-Key': this.apiKey }),\n`;
            code += `      },\n`;
            code += `    });\n`;
            code += `    return response.json();\n`;
            code += `  }\n\n`;
          }
        }
      }
    }

    code += `}\n`;

    return { code, packageName };
  }

  /**
   * Generate JavaScript SDK
   */
  private generateJavaScriptSdk(openApiSpec: string, version: string): { code: string; packageName: string } {
    const packageName = `@strellerminds/api-client-js`;
    // Similar to TypeScript but without types
    const tsSdk = this.generateTypeScriptSdk(openApiSpec, version);
    const jsCode = tsSdk.code.replace(/:\s*\w+/g, '').replace(/<[^>]+>/g, '');
    return { code: jsCode, packageName };
  }

  /**
   * Generate Python SDK
   */
  private generatePythonSdk(openApiSpec: string, version: string): { code: string; packageName: string } {
    const packageName = `strellerminds-api-client`;
    const spec = JSON.parse(openApiSpec);

    let code = `# StrellerMinds API Client - Python SDK\n`;
    code += `# Version: ${version}\n`;
    code += `# Generated: ${new Date().toISOString()}\n\n`;

    code += `import requests\nfrom typing import Optional, Dict, Any\n\n`;

    code += `class StrellerMindsClient:\n`;
    code += `    def __init__(self, base_url: str = "https://api.strellerminds.com", api_key: Optional[str] = None):\n`;
    code += `        self.base_url = base_url\n`;
    code += `        self.api_key = api_key\n`;
    code += `        self.session = requests.Session()\n`;
    code += `        if api_key:\n`;
    code += `            self.session.headers.update({"X-API-Key": api_key})\n\n`;

    // Generate methods
    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(methods as any)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
            const op = operation as any;
            const methodName = this.toSnakeCase(op.operationId || this.generateOperationId(path, method));

            code += `    def ${methodName}(self`;
            if (op.parameters) {
              code += op.parameters
                .map((p: any) => `, ${p.name}${p.required ? '' : '=None'}`)
                .join('');
            }
            code += `) -> Dict[str, Any]:\n`;
            code += `        """${op.summary || ''}"""\n`;
            code += `        response = self.session.${method}(\`\${self.base_url}${path}\`)\n`;
            code += `        response.raise_for_status()\n`;
            code += `        return response.json()\n\n`;
          }
        }
      }
    }

    return { code, packageName };
  }

  /**
   * Generate Java SDK
   */
  private generateJavaSdk(openApiSpec: string, version: string): { code: string; packageName: string } {
    const packageName = `com.strellerminds.api.client`;
    // Java SDK generation would be more complex
    let code = `package com.strellerminds.api.client;\n\n`;
    code += `import java.net.http.HttpClient;\n`;
    code += `import java.net.http.HttpRequest;\n`;
    code += `import java.net.http.HttpResponse;\n\n`;
    code += `public class StrellerMindsClient {\n`;
    code += `    private final String baseUrl;\n`;
    code += `    private final String apiKey;\n`;
    code += `    private final HttpClient client;\n\n`;
    code += `    public StrellerMindsClient(String baseUrl, String apiKey) {\n`;
    code += `        this.baseUrl = baseUrl;\n`;
    code += `        this.apiKey = apiKey;\n`;
    code += `        this.client = HttpClient.newHttpClient();\n`;
    code += `    }\n`;
    code += `    // Additional methods would be generated here\n`;
    code += `}\n`;

    return { code, packageName };
  }

  /**
   * Get main file name for language
   */
  private getMainFileName(language: SdkLanguage): string {
    const map: Record<SdkLanguage, string> = {
      [SdkLanguage.TYPESCRIPT]: 'index.ts',
      [SdkLanguage.JAVASCRIPT]: 'index.js',
      [SdkLanguage.PYTHON]: 'client.py',
      [SdkLanguage.JAVA]: 'StrellerMindsClient.java',
      [SdkLanguage.PHP]: 'Client.php',
      [SdkLanguage.RUBY]: 'client.rb',
      [SdkLanguage.GO]: 'client.go',
      [SdkLanguage.RUST]: 'client.rs',
    };
    return map[language] || 'index.ts';
  }

  /**
   * Write package files (package.json, requirements.txt, etc.)
   */
  private async writePackageFiles(
    sdkDir: string,
    language: SdkLanguage,
    packageName: string,
    version: string,
  ): Promise<void> {
    switch (language) {
      case SdkLanguage.TYPESCRIPT:
      case SdkLanguage.JAVASCRIPT:
        await fs.writeFile(
          path.join(sdkDir, 'package.json'),
          JSON.stringify(
            {
              name: packageName,
              version: '1.0.0',
              description: 'StrellerMinds API Client',
              main: 'index.js',
              types: 'index.d.ts',
              scripts: {
                build: 'tsc',
              },
            },
            null,
            2,
          ),
        );
        break;
      case SdkLanguage.PYTHON:
        await fs.writeFile(
          path.join(sdkDir, 'requirements.txt'),
          'requests>=2.31.0\n',
        );
        await fs.writeFile(
          path.join(sdkDir, 'setup.py'),
          `from setuptools import setup\nsetup(name="${packageName}", version="${version}", install_requires=["requests>=2.31.0"])\n`,
        );
        break;
    }
  }

  /**
   * Create zip archive
   */
  private async createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
    // Use a simple approach - create a tar.gz or just return the directory
    // In production, you'd use archiver or similar library
    // For now, we'll just copy the directory structure
    // The download will serve the directory as-is or use a compression library
    try {
      // Create a simple manifest file
      const manifest = {
        language: path.basename(sourceDir).split('-')[0],
        version: path.basename(sourceDir).split('-')[1],
        files: await this.getDirectoryFiles(sourceDir),
      };
      await fs.writeFile(path.join(sourceDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      
      // For now, we'll use the directory itself
      // In production, install 'archiver' package: npm install archiver @types/archiver
      this.logger.warn('ZIP compression requires archiver package. Using directory structure for now.');
    } catch (error) {
      this.logger.error(`Failed to create archive: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all files in directory
   */
  private async getDirectoryFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.getDirectoryFiles(fullPath);
        files.push(...subFiles.map(f => `${entry.name}/${f}`));
      } else {
        files.push(entry.name);
      }
    }
    
    return files;
  }

  /**
   * Helper methods
   */
  private generateOperationId(path: string, method: string): string {
    const parts = path.split('/').filter(Boolean);
    return `${method.toLowerCase()}${parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).replace(/[{}]/g, ''))}.join('')}`;
  }

  private toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  private getTypeScriptType(schema: any): string {
    if (!schema) return 'any';
    if (schema.type === 'string') return 'string';
    if (schema.type === 'number' || schema.type === 'integer') return 'number';
    if (schema.type === 'boolean') return 'boolean';
    if (schema.type === 'array') return `${this.getTypeScriptType(schema.items)}[]`;
    return 'any';
  }

  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.sdkOutputDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create SDK output directory: ${error.message}`);
    }
  }

  private toResponseDto(record: SdkDownload): SdkDownloadResponseDto {
    return {
      id: record.id,
      language: record.language,
      version: record.version,
      status: record.status,
      downloadUrl: record.downloadUrl,
      fileSize: record.fileSize,
      downloadCount: record.downloadCount,
      createdAt: record.createdAt,
    };
  }

  /**
   * Get SDK by ID
   */
  async getSdk(id: string): Promise<SdkDownload | null> {
    return this.sdkRepository.findOne({ where: { id } });
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(id: string): Promise<void> {
    const sdk = await this.sdkRepository.findOne({ where: { id } });
    if (sdk) {
      sdk.downloadCount += 1;
      await this.sdkRepository.save(sdk);
    }
  }
}
