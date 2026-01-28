import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import * as textract from 'textract';

@Injectable()
export class PlagiarismService {
  private readonly logger = new Logger(PlagiarismService.name);
  private readonly turnitinApiKey: string;
  private readonly turnitinUrl: string;

  constructor(private configService: ConfigService) {
    this.turnitinApiKey = this.configService.get('TURNITIN_API_KEY');
    this.turnitinUrl = this.configService.get('TURNITIN_API_URL');
  }

  async checkPlagiarism(content: string, fileName?: string): Promise<{ score: number; reportUrl?: string }> {
    try {
      if (!this.turnitinApiKey) {
        return this.simpleTextCheck(content);
      }


      const response = await axios.post(`${this.turnitinUrl}/submissions`, {
        title: fileName || 'submission',
        submitter: 'system',
        content: content
      }, {
        headers: {
          'Authorization': `Bearer ${this.turnitinApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        score: response.data.similarity,
        reportUrl: response.data.report_url
      };
    } catch (error) {
      this.logger.error('Plagiarism check failed:', error);
      return { score: 0 };
    }
  }

  private simpleTextCheck(content: string): { score: number } {
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const uniqueness = uniqueWords.size / words.length;
    
    return {
      score: Math.round((1 - uniqueness) * 100)
    };
  }

  async extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      textract.fromFileWithMime(filePath, mimeType, (error, text) => {
        if (error) {
          reject(error);
        } else {
          resolve(text);
        }
      });
    });
  }

  generateFingerprint(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }
}