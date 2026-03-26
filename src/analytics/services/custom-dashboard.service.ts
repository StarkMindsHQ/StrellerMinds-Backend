import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessMetricsService } from './business-metrics.service';
import { VisualizationService } from './visualization.service';
import { PredictiveAnalyticsService } from './predictive-analytics.service';

/**
 * Custom Dashboard Service
 * Allows users to create, customize, and manage analytics dashboards
 */
@Injectable()
export class CustomDashboardService {
  private readonly logger = new Logger(CustomDashboardService.name);
  private dashboards: Map<string, CustomDashboard> = new Map();

  constructor(
    private readonly metricsService: BusinessMetricsService,
    private readonly visualizationService: VisualizationService,
    private readonly predictiveService: PredictiveAnalyticsService,
  ) {}

  /**
   * Create a new custom dashboard
   */
  async createDashboard(userId: string, config: DashboardConfig): Promise<CustomDashboard> {
    const dashboard: CustomDashboard = {
      id: this.generateId(),
      userId,
      name: config.name,
      description: config.description,
      layout: config.layout || 'grid',
      widgets: config.widgets || [],
      filters: config.filters || {},
      isDefault: config.isDefault || false,
      isShared: config.isShared || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.logger.log(`Created dashboard: ${dashboard.name} (${dashboard.id})`);

    return dashboard;
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(dashboardId: string, userId: string): Promise<DashboardData> {
    const dashboard = this.dashboards.get(dashboardId);
    
    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    // Check permissions
    if (dashboard.userId !== userId && !dashboard.isShared) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    // Load widget data
    const widgetData = await this.loadWidgetData(dashboard.widgets, dashboard.filters);

    return {
      dashboard,
      data: widgetData,
    };
  }

  /**
   * Get all dashboards for a user
   */
  async getUserDashboards(userId: string): Promise<CustomDashboard[]> {
    const userDashboards: CustomDashboard[] = [];
    
    for (const dashboard of this.dashboards.values()) {
      if (dashboard.userId === userId || dashboard.isShared) {
        userDashboards.push(dashboard);
      }
    }

    return userDashboards.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    dashboardId: string,
    userId: string,
    updates: Partial<DashboardConfig>,
  ): Promise<CustomDashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    
    if (!dashboard || dashboard.userId !== userId) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    Object.assign(dashboard, updates, { updatedAt: new Date().toISOString() });
    this.dashboards.set(dashboardId, dashboard);

    return dashboard;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId: string, userId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    
    if (!dashboard || dashboard.userId !== userId) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    this.dashboards.delete(dashboardId);
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(
    dashboardId: string,
    userId: string,
    widget: WidgetConfig,
  ): Promise<CustomDashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    
    if (!dashboard || dashboard.userId !== userId) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    const newWidget: Widget = {
      id: this.generateId(),
      ...widget,
      createdAt: new Date().toISOString(),
    };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date().toISOString();
    this.dashboards.set(dashboardId, dashboard);

    return dashboard;
  }

  /**
   * Remove widget from dashboard
   */
  async removeWidget(dashboardId: string, userId: string, widgetId: string): Promise<CustomDashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    
    if (!dashboard || dashboard.userId !== userId) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    dashboard.widgets = dashboard.widgets.filter((w) => w.id !== widgetId);
    dashboard.updatedAt = new Date().toISOString();
    this.dashboards.set(dashboardId, dashboard);

    return dashboard;
  }

  /**
   * Update widget position
   */
  async updateWidgetPosition(
    dashboardId: string,
    userId: string,
    widgetId: string,
    position: WidgetPosition,
  ): Promise<CustomDashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    
    if (!dashboard || dashboard.userId !== userId) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    const widget = dashboard.widgets.find((w) => w.id === widgetId);
    if (widget) {
      widget.position = position;
      dashboard.updatedAt = new Date().toISOString();
      this.dashboards.set(dashboardId, dashboard);
    }

    return dashboard;
  }

  /**
   * Get pre-built dashboard templates
   */
  getDashboardTemplates(): DashboardTemplate[] {
    return [
      {
        id: 'executive-summary',
        name: 'Executive Summary',
        description: 'High-level KPIs for executives',
        category: 'executive',
        widgets: this.getExecutiveWidgets(),
      },
      {
        id: 'learning-analytics',
        name: 'Learning Analytics',
        description: 'Course and learning metrics',
        category: 'learning',
        widgets: this.getLearningWidgets(),
      },
      {
        id: 'user-engagement',
        name: 'User Engagement',
        description: 'User activity and engagement metrics',
        category: 'engagement',
        widgets: this.getEngagementWidgets(),
      },
      {
        id: 'revenue-metrics',
        name: 'Revenue Metrics',
        description: 'Financial and revenue analytics',
        category: 'revenue',
        widgets: this.getRevenueWidgets(),
      },
      {
        id: 'system-health',
        name: 'System Health',
        description: 'Technical performance metrics',
        category: 'technical',
        widgets: this.getSystemHealthWidgets(),
      },
    ];
  }

  /**
   * Create dashboard from template
   */
  async createFromTemplate(
    userId: string,
    templateId: string,
    name: string,
  ): Promise<CustomDashboard> {
    const templates = this.getDashboardTemplates();
    const template = templates.find((t) => t.id === templateId);
    
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    return this.createDashboard(userId, {
      name,
      description: template.description,
      widgets: template.widgets,
      layout: 'grid',
    });
  }

  /**
   * Refresh dashboard data
   */
  async refreshDashboard(dashboardId: string, userId: string): Promise<DashboardData> {
    return this.getDashboard(dashboardId, userId);
  }

  /**
   * Export dashboard
   */
  async exportDashboard(dashboardId: string, userId: string, format: 'json' | 'pdf' | 'png'): Promise<string> {
    const dashboardData = await this.getDashboard(dashboardId, userId);
    
    if (format === 'json') {
      return JSON.stringify(dashboardData, null, 2);
    }
    
    // PDF and PNG would require additional libraries
    this.logger.log(`Export dashboard ${dashboardId} as ${format}`);
    return '';
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async loadWidgetData(widgets: Widget[], filters: DashboardFilters): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    for (const widget of widgets) {
      try {
        data[widget.id] = await this.loadWidgetDataByType(widget, filters);
      } catch (error) {
        this.logger.error(`Failed to load widget ${widget.id}`, error);
        data[widget.id] = { error: 'Failed to load data' };
      }
    }

    return data;
  }

  private async loadWidgetDataByType(widget: Widget, filters: DashboardFilters): Promise<any> {
    const timeRange = {
      from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: filters.dateTo || new Date().toISOString(),
    };

    switch (widget.type) {
      case 'kpi':
        return this.metricsService.getKPISummary();

      case 'metrics':
        return this.metricsService.getBusinessMetrics(timeRange);

      case 'chart':
        const metrics = await this.metricsService.getBusinessMetrics(timeRange);
        return this.visualizationService.generateVisualizations(metrics, widget.config);

      case 'cohort':
        return this.metricsService.getCohortAnalysis(widget.config?.cohortSize || 'week');

      case 'funnel':
        return this.metricsService.getFunnelAnalysis(widget.config?.steps || []);

      case 'predictions':
        // Use predictive analytics
        return this.predictiveService.generateInsights({}, widget.config?.reportType || 'USER_ENGAGEMENT');

      case 'table':
        return this.loadTableData(widget.config);

      default:
        return null;
    }
  }

  private async loadTableData(config: any): Promise<any> {
    // Load data for table widget
    return {
      columns: config.columns || [],
      rows: [],
    };
  }

  private generateId(): string {
    return `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getExecutiveWidgets(): WidgetConfig[] {
    return [
      {
        type: 'kpi',
        title: 'Key Performance Indicators',
        position: { x: 0, y: 0, w: 12, h: 2 },
        config: {},
      },
      {
        type: 'chart',
        title: 'Revenue Trend',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: { chartType: 'line', metric: 'revenue' },
      },
      {
        type: 'chart',
        title: 'User Growth',
        position: { x: 6, y: 2, w: 6, h: 4 },
        config: { chartType: 'line', metric: 'users' },
      },
    ];
  }

  private getLearningWidgets(): WidgetConfig[] {
    return [
      {
        type: 'metrics',
        title: 'Learning Metrics',
        position: { x: 0, y: 0, w: 12, h: 2 },
        config: { category: 'learning' },
      },
      {
        type: 'chart',
        title: 'Course Completion Rates',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: { chartType: 'bar', metric: 'completion' },
      },
      {
        type: 'table',
        title: 'Top Performing Courses',
        position: { x: 6, y: 2, w: 6, h: 4 },
        config: { columns: ['course', 'enrollments', 'completion'] },
      },
    ];
  }

  private getEngagementWidgets(): WidgetConfig[] {
    return [
      {
        type: 'metrics',
        title: 'Engagement Overview',
        position: { x: 0, y: 0, w: 12, h: 2 },
        config: { category: 'engagement' },
      },
      {
        type: 'chart',
        title: 'DAU/MAU Ratio',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: { chartType: 'line', metric: 'dau_mau' },
      },
      {
        type: 'funnel',
        title: 'User Journey',
        position: { x: 6, y: 2, w: 6, h: 4 },
        config: { steps: ['signup', 'onboarding', 'first_course', 'first_lesson', 'completion'] },
      },
    ];
  }

  private getRevenueWidgets(): WidgetConfig[] {
    return [
      {
        type: 'metrics',
        title: 'Revenue Metrics',
        position: { x: 0, y: 0, w: 12, h: 2 },
        config: { category: 'revenue' },
      },
      {
        type: 'chart',
        title: 'MRR Growth',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: { chartType: 'line', metric: 'mrr' },
      },
      {
        type: 'chart',
        title: 'Revenue by Plan',
        position: { x: 6, y: 2, w: 6, h: 4 },
        config: { chartType: 'pie', metric: 'revenue_by_plan' },
      },
    ];
  }

  private getSystemHealthWidgets(): WidgetConfig[] {
    return [
      {
        type: 'metrics',
        title: 'System Health',
        position: { x: 0, y: 0, w: 12, h: 2 },
        config: { category: 'system' },
      },
      {
        type: 'chart',
        title: 'Response Time',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: { chartType: 'line', metric: 'response_time' },
      },
      {
        type: 'chart',
        title: 'Error Rate',
        position: { x: 6, y: 2, w: 6, h: 4 },
        config: { chartType: 'line', metric: 'error_rate' },
      },
    ];
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CustomDashboard {
  id: string;
  userId: string;
  name: string;
  description?: string;
  layout: 'grid' | 'free' | 'tabs';
  widgets: Widget[];
  filters: DashboardFilters;
  isDefault: boolean;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardConfig {
  name: string;
  description?: string;
  layout?: 'grid' | 'free' | 'tabs';
  widgets?: WidgetConfig[];
  filters?: DashboardFilters;
  isDefault?: boolean;
  isShared?: boolean;
}

export interface Widget extends WidgetConfig {
  id: string;
  createdAt: string;
}

export interface WidgetConfig {
  type: 'kpi' | 'metrics' | 'chart' | 'table' | 'cohort' | 'funnel' | 'predictions' | 'text';
  title: string;
  position: WidgetPosition;
  config: Record<string, any>;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  categories?: string[];
  userSegments?: string[];
  [key: string]: any;
}

export interface DashboardData {
  dashboard: CustomDashboard;
  data: Record<string, any>;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  widgets: WidgetConfig[];
}
