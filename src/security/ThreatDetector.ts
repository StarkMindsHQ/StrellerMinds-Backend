import { Injectable, Logger } from '@nestjs/common';
import { ThreatPattern, ThreatScore, AnomalyRecord } from '../models/ThreatPattern';

/**
 * AI-Based Threat Detector Service
 * Performs behavioral analysis and anomaly detection to identify malicious activities
 */
@Injectable()
export class ThreatDetector {
  private readonly logger = new Logger(ThreatDetector.name);
  private threatPatterns: Map<string, ThreatPattern> = new Map();
  private userHistory: Map<string, { lastSeen: Date, successfulRequests: number, failures: number }> = new Map();

  constructor() {
    this.registerPattern({
      id: 'brute-force',
      name: 'Login Brute Force',
      type: 'statistical',
      threshold: 10,
      severity: 'high',
      mitigation: 'block',
    });

    this.registerPattern({
      id: 'ddos-pattern',
      name: 'High Request Rate (Potential DDoS)',
      type: 'statistical',
      threshold: 50,
      severity: 'critical',
      mitigation: 'throttle',
    });
  }

  /**
   * Register a threat pattern for detection
   */
  registerPattern(pattern: ThreatPattern): void {
    this.threatPatterns.set(pattern.id, pattern);
  }

  /**
   * Analyze user behavior and calculate threat score
   */
  async analyzeBehavior(ip: string, userId?: string, resource?: string): Promise<ThreatScore> {
    const key = userId || ip;
    const history = this.userHistory.get(key) || { lastSeen: new Date(), successfulRequests: 0, failures: 0 };
    
    // Simple heuristic: trust builds with successful activity
    const trustScore = Math.min(100, (history.successfulRequests / (history.successfulRequests + history.failures + 1)) * 100);
    const score = this.calculateThreatScore(history, ip, userId);

    const result: ThreatScore = {
      ip,
      userId,
      score,
      detectedPatterns: [],
      suggestedAction: score > 80 ? 'block' : score > 50 ? 'challenge' : 'allow',
      trustScore,
    };

    if (score > 50) {
      this.logger.warn(`[Threat Detector] High threat score ${score} detected for ${key}`);
    }

    return result;
  }

  /**
   * Simple internal threat score calculation (mock AI logic)
   */
  private calculateThreatScore(history: any, ip: string, userId?: string): number {
    let score = 0;
    
    // Example statistical checks
    if (history.failures > 5) score += 40;
    if (history.successfulRequests > 1000) score -= 10; // High trust for heavy users

    // Behavioral anomalies
    if (Date.now() - history.lastSeen.getTime() < 100) score += 20; // Too fast

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Record outcome of a request
   */
  recordActivity(ip: string, userId: string | undefined, success: boolean): void {
    const key = userId || ip;
    const history = this.userHistory.get(key) || { lastSeen: new Date(), successfulRequests: 0, failures: 0 };
    
    history.lastSeen = new Date();
    if (success) {
      history.successfulRequests++;
    } else {
      history.failures++;
    }

    this.userHistory.set(key, history);
  }

  /**
   * Aggregate threat intelligence across users
   */
  getGlobalThreatLevel(): 'low' | 'elevated' | 'high' {
    const totalThreat = Array.from(this.userHistory.values()).reduce((acc, h) => acc + (h.failures > 10 ? 1 : 0), 0);
    if (totalThreat > 50) return 'high';
    if (totalThreat > 10) return 'elevated';
    return 'low';
  }
}
