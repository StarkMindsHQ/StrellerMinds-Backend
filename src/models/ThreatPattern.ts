import { Injectable } from '@nestjs/common';

/**
 * Threat Pattern Interface
 */
export interface ThreatPattern {
  id: string; // e.g., 'brute-force', 'ddos', 'credential-stuffing'
  name: string;
  type: 'behavioral' | 'structural' | 'statistical';
  threshold: number; // Sensitivity of detection
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation: 'block' | 'throttle' | 'challenge' | 'monitor';
}

/**
 * Threat Analysis Result
 */
export interface ThreatScore {
  userId?: string;
  ip: string;
  score: number; // 0-100 (high = suspect)
  detectedPatterns: string[];
  suggestedAction: 'allow' | 'challenge' | 'block';
  trustScore: number; // Calculated based on successful history
}

/**
 * Anomaly Record
 */
export interface AnomalyRecord {
  timestamp: string;
  ip: string;
  userId?: string;
  resource: string;
  behavior: string;
  patternMatched: string;
}
