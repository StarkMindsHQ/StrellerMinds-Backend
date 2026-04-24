import { Injectable, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface FileValidationOptions {
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxSizeInBytes: number;
  enableVirusScan?: boolean;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FileUploadSecurityService {
  /**
   * Validate uploaded file for security
   * Issue #729: Add file type validation, size limits, and virus scanning
   */
  async validateFile(
    file: UploadedFile,
    options: FileValidationOptions,
  ): Promise<void> {
    // 1. Validate file size
    if (file.size > options.maxSizeInBytes) {
      throw new PayloadTooLargeException(
        `File size exceeds maximum allowed size of ${this.formatBytes(options.maxSizeInBytes)}`,
      );
    }

    // 2. Validate file extension
    const fileExtension = this.getFileExtension(file.originalname).toLowerCase();
    if (!options.allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `File type .${fileExtension} is not allowed. Allowed types: ${options.allowedExtensions.join(', ')}`,
      );
    }

    // 3. Validate MIME type
    if (!options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `MIME type ${file.mimetype} is not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
      );
    }

    // 4. Validate file signature (magic numbers) to prevent MIME type spoofing
    await this.validateFileSignature(file.buffer, fileExtension);

    // 5. Virus scanning (if enabled)
    if (options.enableVirusScan) {
      await this.scanForViruses(file.buffer);
    }
  }

  /**
   * Generate a secure filename to prevent directory traversal and special character issues
   */
  generateSecureFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const extension = this.getFileExtension(originalName).toLowerCase();
    return `${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Validate file signature (magic numbers) to detect MIME type spoofing
   */
  private async validateFileSignature(
    buffer: Buffer,
    extension: string,
  ): Promise<void> {
    const magicNumbers: Record<string, string[]> = {
      jpg: ['ffd8ff'],
      jpeg: ['ffd8ff'],
      png: ['89504e47'],
      gif: ['47494638'],
      pdf: ['25504446'],
      mp4: ['00000018', '00000020', '66747970'],
      webm: ['1a45dfa3'],
      doc: ['d0cf11e0'],
      docx: ['504b0304'],
      xls: ['d0cf11e0'],
      xlsx: ['504b0304'],
    };

    const expectedSignatures = magicNumbers[extension];
    if (!expectedSignatures) {
      // Skip validation for unknown file types
      return;
    }

    const fileSignature = buffer.slice(0, 4).toString('hex');
    const isValid = expectedSignatures.some((sig) =>
      fileSignature.startsWith(sig),
    );

    if (!isValid) {
      throw new BadRequestException(
        `File content does not match expected type .${extension}. Possible MIME type spoofing detected.`,
      );
    }
  }

  /**
   * Scan file for viruses (placeholder - integrate with ClamAV or similar)
   */
  private async scanForViruses(buffer: Buffer): Promise<void> {
    // TODO: Integrate with actual virus scanning service
    // Options:
    // 1. ClamAV (open source)
    // 2. AWS Lambda with antivirus
    // 3. Third-party services (VirusTotal API, etc.)
    
    // For now, we'll just log that scanning would occur
    console.log('[File Upload Security] Virus scanning would be performed here');
    
    // Example integration with ClamAV:
    // const clamscan = new ClamScan({
    //   host: process.env.CLAMAV_HOST || 'localhost',
    //   port: parseInt(process.env.CLAMAV_PORT || '3310'),
    // });
    // const result = await clamscan.scanBuffer(buffer);
    // if (result.isInfected) {
    //   throw new BadRequestException('File contains malware and has been rejected');
    // }
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
