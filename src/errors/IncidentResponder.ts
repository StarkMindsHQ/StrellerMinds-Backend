import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  ErrorReport, 
  ErrorIncident, 
  ErrorSeverity, 
  ErrorStatus,
  ErrorCategory 
} from '../models/ErrorReport';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface IncidentDetectionRule {
  name: string;
  condition: (errors: ErrorReport[]) => boolean;
  severity: ErrorSeverity;
  autoCreate: boolean;
  autoAssign?: string;
  cooldownPeriod?: number; // in minutes
}

export interface IncidentResponse {
  incidentId: string;
  action: string;
  successful: boolean;
  message: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface CommunicationChannel {
  type: 'email' | 'slack' | 'sms' | 'webhook' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
}

@Injectable()
export class IncidentResponder {
  private readonly logger = new Logger(IncidentResponder.name);
  private detectionRules: IncidentDetectionRule[] = [];
  private communicationChannels: Map<string, CommunicationChannel> = new Map();
  private activeIncidents: Map<string, ErrorIncident> = new Map();
  private incidentCooldowns: Map<string, Date> = new Map();

  constructor(
    @InjectRepository(ErrorReport)
    private errorRepository: Repository<ErrorReport>,
    @InjectRepository(ErrorIncident)
    private incidentRepository: Repository<ErrorIncident>,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeDetectionRules();
    this.initializeCommunicationChannels();
  }

  async detectIncidents(timeWindow = 15): Promise<ErrorIncident[]> {
    const since = new Date(Date.now() - timeWindow * 60 * 1000);
    
    // Get recent errors
    const recentErrors = await this.errorRepository.find({
      where: {
        createdAt: since,
        status: ErrorStatus.OPEN,
      },
      order: { createdAt: 'DESC' },
    });

    const detectedIncidents: ErrorIncident[] = [];

    for (const rule of this.detectionRules) {
      // Check cooldown period
      const cooldownKey = `${rule.name}_${timeWindow}`;
      const lastCooldown = this.incidentCooldowns.get(cooldownKey);
      
      if (lastCooldown && lastCooldown > new Date()) {
        continue;
      }

      if (rule.condition(recentErrors)) {
        const incident = await this.createIncidentFromRule(rule, recentErrors);
        detectedIncidents.push(incident);
        
        // Set cooldown
        if (rule.cooldownPeriod) {
          this.incidentCooldowns.set(
            cooldownKey,
            new Date(Date.now() + rule.cooldownPeriod * 60 * 1000)
          );
        }
      }
    }

    return detectedIncidents;
  }

  async createIncident(
    title: string,
    description: string,
    severity: ErrorSeverity,
    errorReports: string[],
    userId: string,
    options: {
      affectedServices?: string[];
      impactAssessment?: any;
      isPublic?: boolean;
    } = {},
  ): Promise<ErrorIncident> {
    const incident = this.incidentRepository.create({
      title,
      description,
      severity,
      errorReports,
      errorCount: errorReports.length,
      affectedServices: options.affectedServices || [],
      impactAssessment: options.impactAssessment || {},
      isPublic: options.isPublic || false,
      status: ErrorStatus.OPEN,
      detectedAt: new Date(),
      createdBy: { id: userId } as any,
      timeline: [{
        timestamp: new Date(),
        action: 'incident_created',
        performedBy: userId,
        details: `Incident created: ${title}`,
      }],
    });

    const savedIncident = await this.incidentRepository.save(incident);
    this.activeIncidents.set(savedIncident.id, savedIncident);

    // Emit incident created event
    this.eventEmitter.emit('incident.created', savedIncident);

    // Auto-assign if specified
    if (options.impactAssessment?.assignee) {
      await this.assignIncident(savedIncident.id, options.impactAssessment.assignee, userId);
    }

    // Send initial notifications
    await this.notifyIncident(savedIncident, 'created');

    this.logger.log(`Created incident: ${title} (${savedIncident.id})`);
    return savedIncident;
  }

  async updateIncident(
    incidentId: string,
    updates: Partial<ErrorIncident>,
    userId: string,
  ): Promise<ErrorIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    // Record changes in timeline
    const changes: string[] = [];
    
    if (updates.status && updates.status !== incident.status) {
      changes.push(`Status changed from ${incident.status} to ${updates.status}`);
    }
    
    if (updates.severity && updates.severity !== incident.severity) {
      changes.push(`Severity changed from ${incident.severity} to ${updates.severity}`);
    }
    
    if (updates.assignedTo && updates.assignedTo !== incident.assignedTo) {
      changes.push(`Assigned to ${updates.assignedTo}`);
    }

    Object.assign(incident, updates);
    incident.updatedAt = new Date();

    // Add timeline entry
    if (changes.length > 0) {
      incident.timeline = incident.timeline || [];
      incident.timeline.push({
        timestamp: new Date(),
        action: 'incident_updated',
        performedBy: userId,
        details: changes.join(', '),
      });
    }

    const savedIncident = await this.incidentRepository.save(incident);
    this.activeIncidents.set(incidentId, savedIncident);

    // Emit incident updated event
    this.eventEmitter.emit('incident.updated', savedIncident);

    // Send notifications for significant changes
    if (updates.status === ErrorStatus.RESOLVED) {
      await this.notifyIncident(savedIncident, 'resolved');
    } else if (updates.severity === ErrorSeverity.CRITICAL) {
      await this.notifyIncident(savedIncident, 'escalated');
    }

    return savedIncident;
  }

  async assignIncident(incidentId: string, assigneeId: string, userId: string): Promise<ErrorIncident> {
    return this.updateIncident(incidentId, { 
      assignedTo: assigneeId,
      acknowledgedAt: new Date(),
    }, userId);
  }

  async resolveIncident(
    incidentId: string,
    resolution: {
      rootCause: string;
      preventionMeasures: string;
      resolutionPlan?: any;
    },
    userId: string,
  ): Promise<ErrorIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    const updates = {
      ...resolution,
      status: ErrorStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedBy: { id: userId } as any,
      timeToResolution: Math.floor(
        (Date.now() - incident.createdAt.getTime()) / (1000 * 60) // minutes
      ),
    };

    return this.updateIncident(incidentId, updates, userId);
  }

  async escalateIncident(
    incidentId: string,
    escalationLevel: number,
    reason: string,
    userId: string,
  ): Promise<ErrorIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    const newAssignee = this.getEscalationAssignee(escalationLevel);
    
    const updates = {
      escalationLevel,
      assignedTo: newAssignee,
      severity: escalationLevel > 2 ? ErrorSeverity.CRITICAL : incident.severity,
    };

    const updatedIncident = await this.updateIncident(incidentId, updates, userId);

    // Add escalation timeline entry
    updatedIncident.timeline = updatedIncident.timeline || [];
    updatedIncident.timeline.push({
      timestamp: new Date(),
      action: 'incident_escalated',
      performedBy: userId,
      details: `Escalated to level ${escalationLevel}: ${reason}`,
    });

    await this.incidentRepository.save(updatedIncident);

    // Send escalation notifications
    await this.notifyIncident(updatedIncident, 'escalated', { escalationLevel, reason });

    return updatedIncident;
  }

  async addIncidentComment(
    incidentId: string,
    content: string,
    isInternal: boolean,
    userId: string,
  ): Promise<ErrorIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    // Add comment to timeline
    incident.timeline = incident.timeline || [];
    incident.timeline.push({
      timestamp: new Date(),
      action: 'comment_added',
      performedBy: userId,
      details: isInternal ? `[Internal] ${content}` : content,
    });

    const updatedIncident = await this.incidentRepository.save(incident);

    // Send notification for public comments
    if (!isInternal) {
      await this.notifyIncident(updatedIncident, 'comment_added', { content });
    }

    return updatedIncident;
  }

  async getIncident(incidentId: string): Promise<ErrorIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
      relations: ['createdBy', 'assignedTo', 'resolvedBy'],
    });

    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    return incident;
  }

  async listIncidents(
    filters: {
      status?: ErrorStatus;
      severity?: ErrorSeverity;
      assignedTo?: string;
      isPublic?: boolean;
    } = {},
    page = 1,
    limit = 50,
  ): Promise<{ incidents: ErrorIncident[]; total: number }> {
    const queryBuilder = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.createdBy', 'createdBy')
      .leftJoinAndSelect('incident.assignedTo', 'assignedTo')
      .leftJoinAndSelect('incident.resolvedBy', 'resolvedBy');

    if (filters.status) {
      queryBuilder.andWhere('incident.status = :status', { status: filters.status });
    }

    if (filters.severity) {
      queryBuilder.andWhere('incident.severity = :severity', { severity: filters.severity });
    }

    if (filters.assignedTo) {
      queryBuilder.andWhere('incident.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters.isPublic !== undefined) {
      queryBuilder.andWhere('incident.isPublic = :isPublic', { isPublic: filters.isPublic });
    }

    const total = await queryBuilder.getCount();
    queryBuilder.skip((page - 1) * limit).take(limit);
    queryBuilder.orderBy('incident.createdAt', 'DESC');

    const incidents = await queryBuilder.getMany();
    return { incidents, total };
  }

  async getIncidentMetrics(timeWindow = 24): Promise<Record<string, any>> {
    const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

    const incidents = await this.incidentRepository.find({
      where: {
        createdAt: since,
      },
    });

    const metrics = {
      totalIncidents: incidents.length,
      incidentsByStatus: {} as Record<string, number>,
      incidentsBySeverity: {} as Record<string, number>,
      incidentsByService: {} as Record<string, number>,
      averageResolutionTime: 0,
      criticalIncidents: incidents.filter(i => i.severity === ErrorSeverity.CRITICAL).length,
      resolvedIncidents: incidents.filter(i => i.status === ErrorStatus.RESOLVED).length,
      activeIncidents: incidents.filter(i => i.status === ErrorStatus.OPEN).length,
    };

    // Calculate metrics by category
    for (const incident of incidents) {
      metrics.incidentsByStatus[incident.status] = (metrics.incidentsByStatus[incident.status] || 0) + 1;
      metrics.incidentsBySeverity[incident.severity] = (metrics.incidentsBySeverity[incident.severity] || 0) + 1;
      
      if (incident.affectedServices) {
        for (const service of incident.affectedServices) {
          metrics.incidentsByService[service] = (metrics.incidentsByService[service] || 0) + 1;
        }
      }
    }

    // Calculate average resolution time
    const resolvedIncidents = incidents.filter(i => i.timeToResolution);
    if (resolvedIncidents.length > 0) {
      metrics.averageResolutionTime = resolvedIncidents.reduce((sum, i) => sum + i.timeToResolution, 0) / resolvedIncidents.length;
    }

    return metrics;
  }

  async generateIncidentReport(incidentId: string): Promise<Record<string, any>> {
    const incident = await this.getIncident(incidentId);
    
    // Get related error reports
    const errorReports = await this.errorRepository.find({
      where: { id: incident.errorReports as any },
    });

    return {
      incident: {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        createdAt: incident.createdAt,
        resolvedAt: incident.resolvedAt,
        timeToResolution: incident.timeToResolution,
        affectedServices: incident.affectedServices,
        errorCount: incident.errorCount,
      },
      timeline: incident.timeline,
      errorReports: errorReports.map(err => ({
        id: err.id,
        message: err.message,
        severity: err.severity,
        category: err.category,
        createdAt: err.createdAt,
        occurrenceCount: err.occurrenceCount,
      })),
      impact: incident.impactAssessment,
      resolution: {
        rootCause: incident.rootCause,
        preventionMeasures: incident.preventionMeasures,
        resolutionPlan: incident.resolutionPlan,
      },
      communication: incident.communicationUpdates,
    };
  }

  private async createIncidentFromRule(rule: IncidentDetectionRule, errors: ErrorReport[]): Promise<ErrorIncident> {
    const title = `Auto-detected: ${rule.name}`;
    const description = this.generateIncidentDescription(rule, errors);
    const errorReportIds = errors.map(e => e.id);
    const affectedServices = [...new Set(errors.map(e => e.service).filter(Boolean))];
    const severity = this.calculateIncidentSeverity(errors);

    const incident = await this.createIncident(
      title,
      description,
      severity,
      errorReportIds,
      'system',
      {
        affectedServices,
        isPublic: severity === ErrorSeverity.CRITICAL,
      }
    );

    // Auto-assign if specified
    if (rule.autoAssign) {
      await this.assignIncident(incident.id, rule.autoAssign, 'system');
    }

    return incident;
  }

  private generateIncidentDescription(rule: IncidentDetectionRule, errors: ErrorReport[]): string {
    const errorCounts = errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const affectedServices = [...new Set(errors.map(e => e.service).filter(Boolean))];
    
    let description = `Auto-detected incident based on rule: ${rule.name}\n\n`;
    description += `Error Summary:\n`;
    description += `- Total errors: ${errors.length}\n`;
    description += `- Affected services: ${affectedServices.join(', ')}\n`;
    description += `- Error breakdown: ${Object.entries(errorCounts).map(([cat, count]) => `${cat}: ${count}`).join(', ')}\n\n`;
    
    description += `Sample errors:\n`;
    errors.slice(0, 5).forEach(error => {
      description += `- ${error.message.substring(0, 100)}...\n`;
    });

    return description;
  }

  private calculateIncidentSeverity(errors: ErrorReport[]): ErrorSeverity {
    const severityCounts = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    if (severityCounts[ErrorSeverity.CRITICAL] > 0) return ErrorSeverity.CRITICAL;
    if (severityCounts[ErrorSeverity.HIGH] > 2) return ErrorSeverity.CRITICAL;
    if (severityCounts[ErrorSeverity.HIGH] > 0) return ErrorSeverity.HIGH;
    if (severityCounts[ErrorSeverity.MEDIUM] > 5) return ErrorSeverity.HIGH;
    if (severityCounts[ErrorSeverity.MEDIUM] > 0) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  private async notifyIncident(
    incident: ErrorIncident,
    eventType: string,
    context?: Record<string, any>,
  ): Promise<void> {
    for (const [name, channel] of this.communicationChannels) {
      if (!channel.enabled) continue;

      try {
        await this.sendNotification(channel, incident, eventType, context);
      } catch (error) {
        this.logger.error(`Failed to send notification via ${name}`, error);
      }
    }
  }

  private async sendNotification(
    channel: CommunicationChannel,
    incident: ErrorIncident,
    eventType: string,
    context?: Record<string, any>,
  ): Promise<void> {
    const message = this.formatNotificationMessage(incident, eventType, context);

    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel, message);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, message);
        break;
      case 'sms':
        await this.sendSMSNotification(channel, message);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, message);
        break;
      case 'pagerduty':
        await this.sendPagerDutyNotification(channel, message);
        break;
    }
  }

  private formatNotificationMessage(
    incident: ErrorIncident,
    eventType: string,
    context?: Record<string, any>,
  ): string {
    const messages = {
      created: `🚨 New Incident Created: ${incident.title}`,
      resolved: `✅ Incident Resolved: ${incident.title}`,
      escalated: `🔥 Incident Escalated: ${incident.title}`,
      comment_added: `💬 Update on Incident: ${incident.title}`,
    };

    let message = messages[eventType] || `📢 Incident Update: ${incident.title}`;
    message += `\n\nSeverity: ${incident.severity}`;
    message += `\nStatus: ${incident.status}`;
    
    if (incident.affectedServices?.length > 0) {
      message += `\nAffected Services: ${incident.affectedServices.join(', ')}`;
    }
    
    message += `\nError Count: ${incident.errorCount}`;
    message += `\nCreated: ${incident.createdAt.toISOString()}`;
    
    if (eventType === 'escalated' && context?.escalationLevel) {
      message += `\nEscalation Level: ${context.escalationLevel}`;
      if (context?.reason) {
        message += `\nReason: ${context.reason}`;
      }
    }

    return message;
  }

  private async sendEmailNotification(channel: CommunicationChannel, message: string): Promise<void> {
    // Implementation would depend on your email service
    this.logger.log(`Email notification: ${message}`);
  }

  private async sendSlackNotification(channel: CommunicationChannel, message: string): Promise<void> {
    // Implementation would use Slack API
    this.logger.log(`Slack notification: ${message}`);
  }

  private async sendSMSNotification(channel: CommunicationChannel, message: string): Promise<void> {
    // Implementation would use SMS service
    this.logger.log(`SMS notification: ${message}`);
  }

  private async sendWebhookNotification(channel: CommunicationChannel, message: string): Promise<void> {
    // Implementation would send HTTP request to webhook URL
    this.logger.log(`Webhook notification: ${message}`);
  }

  private async sendPagerDutyNotification(channel: CommunicationChannel, message: string): Promise<void> {
    // Implementation would use PagerDuty API
    this.logger.log(`PagerDuty notification: ${message}`);
  }

  private getEscalationAssignee(level: number): string {
    const assignees = {
      1: 'on_call_engineer',
      2: 'team_lead',
      3: 'engineering_manager',
      4: 'director_of_engineering',
      5: 'cto',
    };
    
    return assignees[level] || 'on_call_engineer';
  }

  private initializeDetectionRules(): void {
    this.detectionRules = [
      {
        name: 'High Error Rate',
        condition: (errors) => errors.length > 50,
        severity: ErrorSeverity.HIGH,
        autoCreate: true,
        cooldownPeriod: 30,
      },
      {
        name: 'Critical Error Spike',
        condition: (errors) => errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length > 3,
        severity: ErrorSeverity.CRITICAL,
        autoCreate: true,
        autoAssign: 'on_call_engineer',
        cooldownPeriod: 15,
      },
      {
        name: 'Service Outage',
        condition: (errors) => {
          const services = errors.reduce((acc, e) => {
            if (e.service) acc[e.service] = (acc[e.service] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          return Object.values(services).some(count => count > 20);
        },
        severity: ErrorSeverity.CRITICAL,
        autoCreate: true,
        autoAssign: 'on_call_engineer',
        cooldownPeriod: 10,
      },
      {
        name: 'Database Issues',
        condition: (errors) => errors.filter(e => e.category === ErrorCategory.DATABASE).length > 10,
        severity: ErrorSeverity.HIGH,
        autoCreate: true,
        cooldownPeriod: 20,
      },
      {
        name: 'Security Incidents',
        condition: (errors) => errors.filter(e => e.category === ErrorCategory.SECURITY).length > 0,
        severity: ErrorSeverity.CRITICAL,
        autoCreate: true,
        autoAssign: 'security_team',
        cooldownPeriod: 5,
      },
    ];

    this.logger.log(`Initialized ${this.detectionRules.length} incident detection rules`);
  }

  private initializeCommunicationChannels(): void {
    // Default communication channels
    this.communicationChannels.set('email', {
      type: 'email',
      config: {
        recipients: ['devops@company.com'],
        template: 'incident-notification',
      },
      enabled: true,
    });

    this.communicationChannels.set('slack', {
      type: 'slack',
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#incidents',
      },
      enabled: true,
    });

    this.communicationChannels.set('pagerduty', {
      type: 'pagerduty',
      config: {
        serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
        severity: 'critical',
      },
      enabled: true,
    });

    this.logger.log(`Initialized ${this.communicationChannels.size} communication channels`);
  }

  async addDetectionRule(rule: IncidentDetectionRule): Promise<void> {
    this.detectionRules.push(rule);
    this.logger.log(`Added detection rule: ${rule.name}`);
  }

  async removeDetectionRule(ruleName: string): Promise<void> {
    this.detectionRules = this.detectionRules.filter(rule => rule.name !== ruleName);
    this.logger.log(`Removed detection rule: ${ruleName}`);
  }

  async getDetectionRules(): Promise<IncidentDetectionRule[]> {
    return [...this.detectionRules];
  }

  async addCommunicationChannel(name: string, channel: CommunicationChannel): Promise<void> {
    this.communicationChannels.set(name, channel);
    this.logger.log(`Added communication channel: ${name}`);
  }

  async removeCommunicationChannel(name: string): Promise<void> {
    this.communicationChannels.delete(name);
    this.logger.log(`Removed communication channel: ${name}`);
  }

  async getCommunicationChannels(): Promise<Record<string, CommunicationChannel>> {
    return Object.fromEntries(this.communicationChannels);
  }
}
