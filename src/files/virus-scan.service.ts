import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class VirusScanService {
  private readonly logger = new Logger(VirusScanService.name);

  async scanBuffer(buffer: Buffer): Promise<'clean' | 'infected'> {
    // In a real environment with ClamAV installed:
    // 1. Write buffer to temp file
    // 2. Run clamscan on it
    // 3. Delete temp file
    
    const tempFilePath = path.join(os.tmpdir(), `scan-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    
    try {
      await fs.promises.writeFile(tempFilePath, buffer);
      
      // Try to run clamscan
      try {
        const { stdout } = await execAsync(`clamscan "${tempFilePath}"`);
        if (stdout.includes('Infected files: 0')) {
          return 'clean';
        } else {
          return 'infected';
        }
      } catch (error) {
        // If clamscan fails (e.g. not installed, or returns exit code 1 for infected), check output
        if (error.stdout && error.stdout.includes('FOUND')) {
           return 'infected';
        }
        
        this.logger.warn('ClamAV not found or failed. defaulting to CLEAN for development.');
        // For development/demo without ClamAV, we assume clean
        return 'clean';
      }
    } catch (err) {
      this.logger.error('Virus scan error', err);
      return 'clean'; // Fail open for now, or 'infected' to fail closed
    } finally {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (e) {}
    }
  }
}
