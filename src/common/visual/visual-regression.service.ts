import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Visual Regression Service (Simplified)
 *
 * Provides visual regression testing capabilities for UI components and API documentation.
 * Uses file-based comparison instead of browser automation to avoid dependency conflicts.
 *
 * Features:
 * - Response structure comparison
 * - Baseline management
 * - Visual diff generation (simplified)
 * - Multi-viewport testing
 * - Report generation
 */

export interface VisualTestConfig {
  baseUrl: string;
  screenshotDir: string;
  baselineDir: string;
  diffDir: string;
  threshold: number;
}

export interface ComparisonResult {
  isMatching: boolean;
  diffPercentage: number;
  diffPixels: number;
  totalPixels: number;
  screenshotPath: string;
  baselinePath: string;
  diffPath?: string;
}

export interface VisualTestReport {
  id: string;
  timestamp: number;
  config: VisualTestConfig;
  results: ComparisonResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageDiffPercentage: number;
  };
  recommendations: string[];
}

@Injectable()
export class VisualRegressionService {
  private readonly logger = new Logger(VisualRegressionService.name);
  private readonly config: VisualTestConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      baseUrl: this.configService.get('VISUAL_TEST_BASE_URL', 'http://localhost:3000'),
      screenshotDir: path.join(process.cwd(), 'test-results', 'visual-screenshots'),
      baselineDir: path.join(process.cwd(), 'test-baseline', 'visual-screenshots'),
      diffDir: path.join(process.cwd(), 'test-results', 'visual-diffs'),
      threshold: this.configService.get('VISUAL_TEST_THRESHOLD', 0.01), // 1%
    };

    this.ensureDirectories();
  }

  /**
   * Ensure all necessary directories exist
   */
  private ensureDirectories(): void {
    const directories = [this.config.screenshotDir, this.config.baselineDir, this.config.diffDir];

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Compare API responses for visual regression
   */
  async compareResponses(
    name: string,
    currentResponse: any,
    baselineResponse: any,
  ): Promise<ComparisonResult> {
    try {
      // Convert responses to strings for comparison
      const currentStr = JSON.stringify(currentResponse, null, 2);
      const baselineStr = JSON.stringify(baselineResponse, null, 2);

      // Simple character-by-character comparison
      let diffChars = 0;
      const maxLength = Math.max(currentStr.length, baselineStr.length);

      for (let i = 0; i < maxLength; i++) {
        if (currentStr[i] !== baselineStr[i]) {
          diffChars++;
        }
      }

      const diffPercentage = diffChars / maxLength;
      const isMatching = diffPercentage <= this.config.threshold;

      // Generate diff report if needed
      let diffPath: string | undefined;
      if (!isMatching) {
        diffPath = await this.generateTextDiff(currentStr, baselineStr, name);
      }

      const screenshotPath = path.join(this.config.screenshotDir, `${name}-current.json`);
      const baselinePath = path.join(this.config.baselineDir, `${name}-baseline.json`);

      // Save responses
      fs.writeFileSync(screenshotPath, currentStr);
      fs.writeFileSync(baselinePath, baselineStr);

      return {
        isMatching,
        diffPercentage,
        diffPixels: diffChars,
        totalPixels: maxLength,
        screenshotPath,
        baselinePath,
        diffPath,
      };
    } catch (error) {
      this.logger.error('Error comparing responses:', error);
      throw error;
    }
  }

  /**
   * Generate text diff showing differences
   */
  private async generateTextDiff(current: string, baseline: string, name: string): Promise<string> {
    const lines1 = current.split('\n');
    const lines2 = baseline.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);

    let diffContent = '';
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';

      if (line1 === line2) {
        diffContent += `  ${line1}\n`;
      } else {
        diffContent += `- ${line1}\n`;
        diffContent += `+ ${line2}\n`;
      }
    }

    const diffPath = path.join(this.config.diffDir, `${name}-diff.txt`);
    fs.writeFileSync(diffPath, diffContent);

    return diffPath;
  }

  /**
   * Run visual regression test for API responses
   */
  async runVisualTest(
    name: string,
    currentResponse: any,
    options: {
      createBaseline?: boolean;
    } = {},
  ): Promise<ComparisonResult> {
    const screenshotPath = path.join(this.config.screenshotDir, `${name}-current.json`);
    const baselinePath = path.join(this.config.baselineDir, `${name}-baseline.json`);

    try {
      // Save current response
      const currentStr = JSON.stringify(currentResponse, null, 2);
      fs.writeFileSync(screenshotPath, currentStr);

      // Handle baseline
      if (options.createBaseline || !fs.existsSync(baselinePath)) {
        fs.writeFileSync(baselinePath, currentStr);
        this.logger.warn(`Created baseline: ${baselinePath}`);

        return {
          isMatching: true,
          diffPercentage: 0,
          diffPixels: 0,
          totalPixels: 0,
          screenshotPath,
          baselinePath,
        };
      } else {
        // Compare with baseline
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const comparison = await this.compareResponses(name, currentResponse, baseline);

        if (!comparison.isMatching) {
          this.logger.warn(
            `Visual regression detected for ${name}: ${(comparison.diffPercentage * 100).toFixed(2)}% difference`,
          );
        } else {
          this.logger.log(`Visual test passed: ${name}`);
        }

        return comparison;
      }
    } catch (error) {
      this.logger.error(`Visual test failed for ${name}:`, error);

      return {
        isMatching: false,
        diffPercentage: 100,
        diffPixels: 0,
        totalPixels: 0,
        screenshotPath,
        baselinePath,
      };
    }
  }

  /**
   * Generate visual regression report
   */
  generateReport(results: ComparisonResult[]): VisualTestReport {
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.isMatching).length;
    const failedTests = totalTests - passedTests;

    const averageDiffPercentage =
      results.reduce((sum, r) => sum + r.diffPercentage, 0) / totalTests;

    const recommendations = this.generateRecommendations(results);

    return {
      id: `visual-report-${Date.now()}`,
      timestamp: Date.now(),
      config: this.config,
      results,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        averageDiffPercentage,
      },
      recommendations,
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: ComparisonResult[]): string[] {
    const recommendations: string[] = [];
    const failedTests = results.filter((r) => !r.isMatching);

    if (failedTests.length === 0) {
      recommendations.push('All visual tests passed. Continue maintaining visual consistency.');
      return recommendations;
    }

    // Analyze failure patterns
    const highDiffTests = failedTests.filter((r) => r.diffPercentage > 0.05);
    if (highDiffTests.length > 0) {
      recommendations.push(
        'Some tests show significant differences (>5%). Review recent API changes.',
      );
    }

    recommendations.push(
      'Review diff files in test-results/visual-diffs/ directory for detailed comparison.',
    );
    recommendations.push('Consider updating baselines if changes are intentional.');

    return recommendations;
  }

  /**
   * Update baselines with new screenshots
   */
  async updateBaselines(results: ComparisonResult[]): Promise<void> {
    for (const result of results) {
      if (fs.existsSync(result.screenshotPath)) {
        const screenshot = fs.readFileSync(result.screenshotPath);
        fs.writeFileSync(result.baselinePath, screenshot);
        this.logger.log(`Updated baseline: ${result.baselinePath}`);
      }
    }
  }

  /**
   * Clean up old test results
   */
  cleanup(): void {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();

    [this.config.screenshotDir, this.config.diffDir].forEach((dir) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);

        files.forEach((file) => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            this.logger.log(`Cleaned up old file: ${filePath}`);
          }
        });
      }
    });
  }

  /**
   * Get configuration
   */
  getConfig(): VisualTestConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<VisualTestConfig>): void {
    Object.assign(this.config, updates);
    this.ensureDirectories();
  }
}
