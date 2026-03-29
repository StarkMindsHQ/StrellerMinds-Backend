import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResourceType, AuditSeverity } from '../models/AuditLog';

export interface ForensicQuery {
  userId?: string;
  resourceType?: AuditResourceType;
  resourceId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  sessionId?: string;
  correlationId?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ForensicAnalysis {
  timeline: ForensicEvent[];
  patterns: ForensicPattern[];
  anomalies: ForensicAnomaly[];
  statistics: ForensicStatistics;
  recommendations: string[];
}

export interface ForensicEvent {
  timestamp: Date;
  userId?: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  severity: AuditSeverity;
  description?: string;
  ipAddress?: string;
  metadata?: any;
}

export interface ForensicPattern {
  type: string;
  description: string;
  frequency: number;
  confidence: number;
  events: ForensicEvent[];
}

export interface ForensicAnomaly {
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  events: ForensicEvent[];
  detectedAt: Date;
}

export interface ForensicStatistics {
  totalEvents: number;
  uniqueUsers: number;
  uniqueResources: number;
  severityDistribution: Record<AuditSeverity, number>;
  actionDistribution: Record<AuditAction, number>;
  resourceTypeDistribution: Record<AuditResourceType, number>;
  hourlyActivity: Record<number, number>;
  dailyActivity: Record<string, number>;
}

@Injectable()
export class ForensicAnalyzer {
  private readonly logger = new Logger(ForensicAnalyzer.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async analyzeIncident(query: ForensicQuery): Promise<ForensicAnalysis> {
    this.logger.log(`Starting forensic analysis for query: ${JSON.stringify(query)}`);

    const events = await this.queryEvents(query);
    const patterns = await this.detectPatterns(events);
    const anomalies = await this.detectAnomalies(events);
    const statistics = this.calculateStatistics(events);
    const recommendations = this.generateRecommendations(patterns, anomalies, statistics);

    return {
      timeline: events,
      patterns,
      anomalies,
      statistics,
      recommendations,
    };
  }

  async queryEvents(query: ForensicQuery): Promise<ForensicEvent[]> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user');

    // Apply filters
    if (query.userId) {
      queryBuilder.andWhere('auditLog.userId = :userId', { userId: query.userId });
    }

    if (query.resourceType) {
      queryBuilder.andWhere('auditLog.resourceType = :resourceType', { resourceType: query.resourceType });
    }

    if (query.resourceId) {
      queryBuilder.andWhere('auditLog.resourceId = :resourceId', { resourceId: query.resourceId });
    }

    if (query.action) {
      queryBuilder.andWhere('auditLog.action = :action', { action: query.action });
    }

    if (query.severity) {
      queryBuilder.andWhere('auditLog.severity = :severity', { severity: query.severity });
    }

    if (query.startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', { endDate: query.endDate });
    }

    if (query.ipAddress) {
      queryBuilder.andWhere('auditLog.ipAddress = :ipAddress', { ipAddress: query.ipAddress });
    }

    if (query.sessionId) {
      queryBuilder.andWhere('auditLog.sessionId = :sessionId', { sessionId: query.sessionId });
    }

    if (query.correlationId) {
      queryBuilder.andWhere('auditLog.correlationId = :correlationId', { correlationId: query.correlationId });
    }

    if (query.category) {
      queryBuilder.andWhere('auditLog.category = :category', { category: query.category });
    }

    queryBuilder.orderBy('auditLog.createdAt', 'ASC');

    if (query.limit) {
      queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder.offset(query.offset);
    }

    const auditLogs = await queryBuilder.getMany();

    return auditLogs.map(log => ({
      timestamp: log.createdAt,
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      severity: log.severity,
      description: log.description,
      ipAddress: log.ipAddress,
      metadata: log.metadata,
    }));
  }

  async detectPatterns(events: ForensicEvent[]): Promise<ForensicPattern[]> {
    const patterns: ForensicPattern[] = [];

    // Detect sequential actions pattern
    const sequentialPatterns = this.detectSequentialPatterns(events);
    patterns.push(...sequentialPatterns);

    // Detect time-based patterns
    const timePatterns = this.detectTimeBasedPatterns(events);
    patterns.push(...timePatterns);

    // Detect user behavior patterns
    const userPatterns = this.detectUserBehaviorPatterns(events);
    patterns.push(...userPatterns);

    // Detect resource access patterns
    const resourcePatterns = this.detectResourceAccessPatterns(events);
    patterns.push(...resourcePatterns);

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  private detectSequentialPatterns(events: ForensicEvent[]): ForensicPattern[] {
    const patterns: ForensicPattern[] = [];
    const actionSequences = new Map<string, ForensicEvent[]>();

    // Group events by user and session
    events.forEach(event => {
      const key = `${event.userId}-${event.sessionId || 'no-session'}`;
      if (!actionSequences.has(key)) {
        actionSequences.set(key, []);
      }
      actionSequences.get(key)!.push(event);
    });

    // Look for common action sequences
    const sequences = Array.from(actionSequences.values());
    const commonSequences = this.findCommonSequences(sequences, 3);

    commonSequences.forEach((sequence, index) => {
      if (sequence.length >= 3) {
        patterns.push({
          type: 'SEQUENTIAL_ACTIONS',
          description: `Common action sequence: ${sequence.map(e => e.action).join(' -> ')}`,
          frequency: this.getSequenceFrequency(sequences, sequence),
          confidence: Math.min(sequence.length * 0.2, 1.0),
          events: sequence,
        });
      }
    });

    return patterns;
  }

  private detectTimeBasedPatterns(events: ForensicEvent[]): ForensicPattern[] {
    const patterns: ForensicPattern[] = [];
    const hourlyDistribution = new Map<number, number>();

    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourlyDistribution.set(hour, (hourlyDistribution.get(hour) || 0) + 1);
    });

    // Find peak hours
    const avgEvents = events.length / 24;
    hourlyDistribution.forEach((count, hour) => {
      if (count > avgEvents * 2) {
        const hourEvents = events.filter(e => e.timestamp.getHours() === hour);
        patterns.push({
          type: 'TIME_BASED',
          description: `High activity during hour ${hour}:00`,
          frequency: count,
          confidence: Math.min(count / (avgEvents * 3), 1.0),
          events: hourEvents,
        });
      }
    });

    return patterns;
  }

  private detectUserBehaviorPatterns(events: ForensicEvent[]): ForensicPattern[] {
    const patterns: ForensicPattern[] = [];
    const userActivities = new Map<string, ForensicEvent[]>();

    events.forEach(event => {
      if (event.userId) {
        if (!userActivities.has(event.userId)) {
          userActivities.set(event.userId, []);
        }
        userActivities.get(event.userId)!.push(event);
      }
    });

    // Detect unusual user behavior
    userActivities.forEach((userEvents, userId) => {
      const uniqueResources = new Set(userEvents.map(e => e.resourceId)).size;
      const totalEvents = userEvents.length;
      
      // High volume access pattern
      if (totalEvents > 100) {
        patterns.push({
          type: 'HIGH_VOLUME_ACCESS',
          description: `User ${userId} performed ${totalEvents} actions`,
          frequency: totalEvents,
          confidence: Math.min(totalEvents / 200, 1.0),
          events: userEvents,
        });
      }

      // Broad resource access pattern
      if (uniqueResources > 50) {
        patterns.push({
          type: 'BROAD_RESOURCE_ACCESS',
          description: `User ${userId} accessed ${uniqueResources} different resources`,
          frequency: uniqueResources,
          confidence: Math.min(uniqueResources / 100, 1.0),
          events: userEvents,
        });
      }
    });

    return patterns;
  }

  private detectResourceAccessPatterns(events: ForensicEvent[]): ForensicPattern[] {
    const patterns: ForensicPattern[] = [];
    const resourceAccess = new Map<string, ForensicEvent[]>();

    events.forEach(event => {
      if (event.resourceId) {
        const key = `${event.resourceType}-${event.resourceId}`;
        if (!resourceAccess.has(key)) {
          resourceAccess.set(key, []);
        }
        resourceAccess.get(key)!.push(event);
      }
    });

    // Detect frequently accessed resources
    resourceAccess.forEach((resourceEvents, resourceKey) => {
      const accessCount = resourceEvents.length;
      const uniqueUsers = new Set(resourceEvents.map(e => e.userId)).size;
      
      if (accessCount > 50) {
        patterns.push({
          type: 'FREQUENT_RESOURCE_ACCESS',
          description: `Resource ${resourceKey} accessed ${accessCount} times by ${uniqueUsers} users`,
          frequency: accessCount,
          confidence: Math.min(accessCount / 100, 1.0),
          events: resourceEvents,
        });
      }
    });

    return patterns;
  }

  private findCommonSequences(sequences: ForensicEvent[][], minLength: number): ForensicEvent[][] {
    const commonSequences: ForensicEvent[][] = [];
    
    // Simple implementation - look for repeated action patterns
    const actionPatterns = new Map<string, number>();
    
    sequences.forEach(sequence => {
      for (let i = 0; i <= sequence.length - minLength; i++) {
        const pattern = sequence.slice(i, i + minLength).map(e => e.action).join('-');
        actionPatterns.set(pattern, (actionPatterns.get(pattern) || 0) + 1);
      }
    });

    // Return sequences that appear multiple times
    actionPatterns.forEach((count, pattern) => {
      if (count >= 2) {
        const actions = pattern.split('-');
        const sampleSequence = sequences.find(seq => 
          seq.slice(0, minLength).map(e => e.action).join('-') === pattern
        );
        if (sampleSequence) {
          commonSequences.push(sampleSequence.slice(0, minLength));
        }
      }
    });

    return commonSequences;
  }

  private getSequenceFrequency(sequences: ForensicEvent[][], targetSequence: ForensicEvent[]): number {
    const targetActions = targetSequence.map(e => e.action).join('-');
    let frequency = 0;

    sequences.forEach(sequence => {
      for (let i = 0; i <= sequence.length - targetSequence.length; i++) {
        const actions = sequence.slice(i, i + targetSequence.length).map(e => e.action).join('-');
        if (actions === targetActions) {
          frequency++;
          break;
        }
      }
    });

    return frequency;
  }

  async detectAnomalies(events: ForensicEvent[]): Promise<ForensicAnomaly[]> {
    const anomalies: ForensicAnomaly[] = [];

    // Detect failed login attempts
    const loginAnomalies = this.detectLoginAnomalies(events);
    anomalies.push(...loginAnomalies);

    // Detect unusual access patterns
    const accessAnomalies = this.detectAccessAnomalies(events);
    anomalies.push(...accessAnomalies);

    // Detect time-based anomalies
    const timeAnomalies = this.detectTimeAnomalies(events);
    anomalies.push(...timeAnomalies);

    // Detect privilege escalation attempts
    const privilegeAnomalies = this.detectPrivilegeAnomalies(events);
    anomalies.push(...privilegeAnomalies);

    return anomalies;
  }

  private detectLoginAnomalies(events: ForensicEvent[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    const failedLogins = events.filter(e => e.action === AuditAction.LOGIN && e.severity >= AuditSeverity.HIGH);

    // Group failed logins by IP and user
    const ipFailures = new Map<string, ForensicEvent[]>();
    const userFailures = new Map<string, ForensicEvent[]>();

    failedLogins.forEach(login => {
      if (login.ipAddress) {
        ipFailures.set(login.ipAddress, (ipFailures.get(login.ipAddress) || []).concat(login));
      }
      if (login.userId) {
        userFailures.set(login.userId, (userFailures.get(login.userId) || []).concat(login));
      }
    });

    // Detect brute force attempts
    ipFailures.forEach((failures, ip) => {
      if (failures.length >= 5) {
        anomalies.push({
          type: 'BRUTE_FORCE_ATTEMPT',
          description: `Multiple failed login attempts from IP ${ip}`,
          severity: 'HIGH',
          events: failures,
          detectedAt: new Date(),
        });
      }
    });

    // Detect account targeting
    userFailures.forEach((failures, userId) => {
      if (failures.length >= 3) {
        anomalies.push({
          type: 'ACCOUNT_TARGETING',
          description: `Multiple failed login attempts for user ${userId}`,
          severity: 'MEDIUM',
          events: failures,
          detectedAt: new Date(),
        });
      }
    });

    return anomalies;
  }

  private detectAccessAnomalies(events: ForensicEvent[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    
    // Detect unusual time access (e.g., after hours)
    const afterHoursEvents = events.filter(e => {
      const hour = e.timestamp.getHours();
      return hour < 6 || hour > 22;
    });

    if (afterHoursEvents.length > 0) {
      anomalies.push({
        type: 'AFTER_HOURS_ACCESS',
        description: `Access during unusual hours: ${afterHoursEvents.length} events`,
        severity: 'MEDIUM',
        events: afterHoursEvents,
        detectedAt: new Date(),
      });
    }

    // Detect rapid successive actions (potential automation)
    const rapidActions = this.detectRapidActions(events);
    anomalies.push(...rapidActions);

    return anomalies;
  }

  private detectRapidActions(events: ForensicEvent[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const next = sortedEvents[i + 1];
      const timeDiff = next.timestamp.getTime() - current.timestamp.getTime();

      // Actions within 1 second
      if (timeDiff < 1000 && current.userId === next.userId) {
        const rapidSequence = [current, next];
        
        // Look for more rapid actions
        for (let j = i + 2; j < sortedEvents.length; j++) {
          const prevEvent = sortedEvents[j - 1];
          const currentEvent = sortedEvents[j];
          const diff = currentEvent.timestamp.getTime() - prevEvent.timestamp.getTime();
          
          if (diff < 1000 && currentEvent.userId === current.userId) {
            rapidSequence.push(currentEvent);
          } else {
            break;
          }
        }

        if (rapidSequence.length >= 5) {
          anomalies.push({
            type: 'RAPID_SUCCESSIVE_ACTIONS',
            description: `Rapid succession of ${rapidSequence.length} actions by user ${current.userId}`,
            severity: 'MEDIUM',
            events: rapidSequence,
            detectedAt: new Date(),
          });
          i += rapidSequence.length - 1; // Skip processed events
        }
      }
    }

    return anomalies;
  }

  private detectTimeAnomalies(events: ForensicEvent[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    
    // Detect gaps in logging (potential system issues)
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const next = sortedEvents[i + 1];
      const timeDiff = next.timestamp.getTime() - current.timestamp.getTime();
      
      // Gap of more than 1 hour during active periods
      if (timeDiff > 3600000 && this.isDuringActiveHours(current.timestamp)) {
        anomalies.push({
          type: 'LOGGING_GAP',
          description: `Gap of ${Math.round(timeDiff / 60000)} minutes in audit logging`,
          severity: 'LOW',
          events: [current, next],
          detectedAt: new Date(),
        });
      }
    }

    return anomalies;
  }

  private detectPrivilegeAnomalies(events: ForensicEvent[]): ForensicAnomaly[] {
    const anomalies: ForensicAnomaly[] = [];
    
    // Detect privilege escalation attempts
    const privilegeEvents = events.filter(e => 
      e.action === AuditAction.UPDATE && 
      e.resourceType === AuditResourceType.USER &&
      e.metadata?.roleChanges
    );

    if (privilegeEvents.length > 0) {
      anomalies.push({
        type: 'PRIVILEGE_ESCALATION',
        description: `Privilege escalation attempts detected: ${privilegeEvents.length} events`,
        severity: 'HIGH',
        events: privilegeEvents,
        detectedAt: new Date(),
      });
    }

    return anomalies;
  }

  private isDuringActiveHours(timestamp: Date): boolean {
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    
    // Weekdays during business hours
    return day >= 1 && day <= 5 && hour >= 8 && hour <= 18;
  }

  private calculateStatistics(events: ForensicEvent[]): ForensicStatistics {
    const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId!)).size;
    const uniqueResources = new Set(events.filter(e => e.resourceId).map(e => e.resourceId!)).size;

    const severityDistribution = {} as Record<AuditSeverity, number>;
    const actionDistribution = {} as Record<AuditAction, number>;
    const resourceTypeDistribution = {} as Record<AuditResourceType, number>;

    // Initialize distributions
    Object.values(AuditSeverity).forEach(severity => {
      severityDistribution[severity] = 0;
    });
    Object.values(AuditAction).forEach(action => {
      actionDistribution[action] = 0;
    });
    Object.values(AuditResourceType).forEach(resourceType => {
      resourceTypeDistribution[resourceType] = 0;
    });

    // Calculate distributions
    events.forEach(event => {
      severityDistribution[event.severity]++;
      actionDistribution[event.action]++;
      resourceTypeDistribution[event.resourceType]++;
    });

    // Calculate hourly and daily activity
    const hourlyActivity = {} as Record<number, number>;
    const dailyActivity = {} as Record<string, number>;

    events.forEach(event => {
      const hour = event.timestamp.getHours();
      const day = event.timestamp.toISOString().split('T')[0];
      
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      uniqueUsers,
      uniqueResources,
      severityDistribution,
      actionDistribution,
      resourceTypeDistribution,
      hourlyActivity,
      dailyActivity,
    };
  }

  private generateRecommendations(
    patterns: ForensicPattern[],
    anomalies: ForensicAnomaly[],
    statistics: ForensicStatistics,
  ): string[] {
    const recommendations: string[] = [];

    // Security recommendations based on anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL');
    if (criticalAnomalies.length > 0) {
      recommendations.push('URGENT: Critical security anomalies detected. Immediate investigation required.');
    }

    const highAnomalies = anomalies.filter(a => a.severity === 'HIGH');
    if (highAnomalies.length > 0) {
      recommendations.push('High-priority security anomalies detected. Review within 24 hours.');
    }

    // Pattern-based recommendations
    const highVolumePatterns = patterns.filter(p => p.type === 'HIGH_VOLUME_ACCESS' && p.confidence > 0.8);
    if (highVolumePatterns.length > 0) {
      recommendations.push('Consider implementing rate limiting for high-volume access patterns.');
    }

    // Statistical recommendations
    if (statistics.totalEvents > 10000) {
      recommendations.push('High volume of audit events detected. Consider implementing log rotation.');
    }

    const highSeverityRatio = (statistics.severityDistribution[AuditSeverity.HIGH] + 
                              statistics.severityDistribution[AuditSeverity.CRITICAL]) / statistics.totalEvents;
    
    if (highSeverityRatio > 0.1) {
      recommendations.push('High ratio of severe events detected. Review security policies.');
    }

    // Compliance recommendations
    if (statistics.uniqueUsers > 1000) {
      recommendations.push('Large user base detected. Ensure GDPR compliance measures are in place.');
    }

    return recommendations;
  }

  async exportForensicReport(analysis: ForensicAnalysis): Promise<string> {
    const report = {
      generatedAt: new Date(),
      summary: {
        totalEvents: analysis.timeline.length,
        patternsDetected: analysis.patterns.length,
        anomaliesDetected: analysis.anomalies.length,
        recommendations: analysis.recommendations.length,
      },
      timeline: analysis.timeline,
      patterns: analysis.patterns,
      anomalies: analysis.anomalies,
      statistics: analysis.statistics,
      recommendations: analysis.recommendations,
    };

    return JSON.stringify(report, null, 2);
  }
}
