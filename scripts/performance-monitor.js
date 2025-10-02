#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.monitoringInterval = parseInt(process.env.MONITORING_INTERVAL) || 30000; // 30 seconds
    this.isRunning = false;
    this.metrics = [];
    this.alerts = [];

    // Performance thresholds
    this.thresholds = {
      responseTime: 2000, // ms
      errorRate: 5, // percentage
      memoryUsage: 80, // percentage
      cpuUsage: 80, // percentage
    };
  }

  async start() {
    console.log('🔍 Starting Performance Monitor...');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Monitoring interval: ${this.monitoringInterval / 1000}s`);

    this.isRunning = true;

    // Set up graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    // Start monitoring loop
    this.monitoringLoop();

    console.log('✅ Performance monitoring started. Press Ctrl+C to stop.');
  }

  async stop() {
    console.log('\n🛑 Stopping performance monitor...');
    this.isRunning = false;

    await this.generateReport();
    console.log('✅ Performance monitoring stopped.');
    process.exit(0);
  }

  async monitoringLoop() {
    while (this.isRunning) {
      try {
        const metrics = await this.collectMetrics();
        this.metrics.push(metrics);

        // Check for alerts
        await this.checkAlerts(metrics);

        // Keep only last 1000 metrics to prevent memory issues
        if (this.metrics.length > 1000) {
          this.metrics = this.metrics.slice(-1000);
        }

        this.logMetrics(metrics);
      } catch (error) {
        console.error('❌ Error collecting metrics:', error.message);
      }

      // Wait for next interval
      await new Promise((resolve) => setTimeout(resolve, this.monitoringInterval));
    }
  }

  async collectMetrics() {
    const timestamp = new Date().toISOString();
    const metrics = {
      timestamp,
      system: await this.collectSystemMetrics(),
      endpoints: await this.collectEndpointMetrics(),
      database: await this.collectDatabaseMetrics(),
      application: await this.collectApplicationMetrics(),
    };

    return metrics;
  }

  async collectSystemMetrics() {
    try {
      const healthResponse = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });

      return {
        status: healthResponse.status === 200 ? 'healthy' : 'unhealthy',
        responseTime: this.extractResponseTime(healthResponse),
        memory: this.getMemoryUsage(),
        uptime: process.uptime(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        memory: this.getMemoryUsage(),
        uptime: process.uptime(),
      };
    }
  }

  async collectEndpointMetrics() {
    const endpoints = [
      { name: 'courses', path: '/courses?page=1&limit=10' },
      { name: 'categories', path: '/courses/categories' },
      { name: 'search', path: '/courses/search?q=test' },
    ];

    const endpointMetrics = {};

    for (const endpoint of endpoints) {
      try {
        const startTime = process.hrtime.bigint();
        const response = await axios.get(`${this.baseUrl}${endpoint.path}`, { timeout: 10000 });
        const endTime = process.hrtime.bigint();

        endpointMetrics[endpoint.name] = {
          responseTime: Number(endTime - startTime) / 1000000, // Convert to ms
          statusCode: response.status,
          success: true,
        };
      } catch (error) {
        endpointMetrics[endpoint.name] = {
          responseTime: null,
          statusCode: error.response?.status || 0,
          success: false,
          error: error.message,
        };
      }
    }

    return endpointMetrics;
  }

  async collectDatabaseMetrics() {
    try {
      // Try to get database metrics from the monitoring endpoint
      const metricsResponse = await axios.get(`${this.baseUrl}/metrics`, { timeout: 5000 });

      // Parse Prometheus metrics (simplified)
      const metricsText = metricsResponse.data;

      return {
        available: true,
        connectionPool: this.parsePrometheusMetric(metricsText, 'db_connections'),
        queryTime: this.parsePrometheusMetric(metricsText, 'db_query_duration'),
        activeConnections: this.parsePrometheusMetric(metricsText, 'db_active_connections'),
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
      };
    }
  }

  async collectApplicationMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        usagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      eventLoop: {
        // Add event loop lag measurement if needed
      },
    };
  }

  async checkAlerts(metrics) {
    const alerts = [];

    // Check response time alerts
    Object.entries(metrics.endpoints).forEach(([endpoint, data]) => {
      if (data.responseTime && data.responseTime > this.thresholds.responseTime) {
        alerts.push({
          type: 'HIGH_RESPONSE_TIME',
          endpoint,
          value: data.responseTime,
          threshold: this.thresholds.responseTime,
          timestamp: metrics.timestamp,
        });
      }

      if (!data.success) {
        alerts.push({
          type: 'ENDPOINT_ERROR',
          endpoint,
          error: data.error,
          timestamp: metrics.timestamp,
        });
      }
    });

    // Check memory usage
    if (metrics.application.memory.usagePercent > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        value: metrics.application.memory.usagePercent,
        threshold: this.thresholds.memoryUsage,
        timestamp: metrics.timestamp,
      });
    }

    // Check system health
    if (metrics.system.status !== 'healthy') {
      alerts.push({
        type: 'SYSTEM_UNHEALTHY',
        status: metrics.system.status,
        error: metrics.system.error,
        timestamp: metrics.timestamp,
      });
    }

    // Log and store alerts
    alerts.forEach((alert) => {
      console.warn(`🚨 ALERT: ${alert.type}`, alert);
      this.alerts.push(alert);
    });
  }

  logMetrics(metrics) {
    const timestamp = new Date(metrics.timestamp).toLocaleTimeString();

    console.log(`\n📊 [${timestamp}] Performance Metrics:`);
    console.log(`   System: ${metrics.system.status} (${metrics.system.responseTime || 'N/A'})`);
    console.log(`   Memory: ${metrics.application.memory.usagePercent.toFixed(1)}%`);

    Object.entries(metrics.endpoints).forEach(([name, data]) => {
      const status = data.success ? '✅' : '❌';
      const time = data.responseTime ? `${data.responseTime.toFixed(0)}ms` : 'ERROR';
      console.log(`   ${name}: ${status} ${time}`);
    });
  }

  async generateReport() {
    console.log('\n📋 Generating performance monitoring report...');

    if (this.metrics.length === 0) {
      console.log('No metrics collected.');
      return;
    }

    const report = {
      summary: this.generateSummary(),
      alerts: this.alerts,
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
    };

    // Save report
    const reportsDir = path.join(process.cwd(), 'test', 'performance', 'monitoring-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `monitoring-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`💾 Report saved to: ${filepath}`);

    this.printSummary(report.summary);
  }

  generateSummary() {
    const validMetrics = this.metrics.filter((m) => m.system.status === 'healthy');

    if (validMetrics.length === 0) {
      return { error: 'No valid metrics collected' };
    }

    // Calculate averages
    const avgMemoryUsage =
      validMetrics.reduce((sum, m) => sum + m.application.memory.usagePercent, 0) /
      validMetrics.length;

    const endpointSummary = {};
    const endpointNames = Object.keys(validMetrics[0].endpoints);

    endpointNames.forEach((name) => {
      const endpointMetrics = validMetrics
        .map((m) => m.endpoints[name])
        .filter((e) => e.success && e.responseTime);

      if (endpointMetrics.length > 0) {
        const responseTimes = endpointMetrics.map((e) => e.responseTime);
        endpointSummary[name] = {
          avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          minResponseTime: Math.min(...responseTimes),
          maxResponseTime: Math.max(...responseTimes),
          successRate: (endpointMetrics.length / validMetrics.length) * 100,
        };
      }
    });

    return {
      duration: validMetrics.length * (this.monitoringInterval / 1000), // seconds
      totalMetrics: this.metrics.length,
      validMetrics: validMetrics.length,
      avgMemoryUsage,
      totalAlerts: this.alerts.length,
      endpoints: endpointSummary,
    };
  }

  printSummary(summary) {
    console.log('\n📊 MONITORING SUMMARY');
    console.log('====================');
    console.log(`Duration: ${summary.duration}s`);
    console.log(`Total Metrics: ${summary.totalMetrics}`);
    console.log(`Valid Metrics: ${summary.validMetrics}`);
    console.log(`Average Memory Usage: ${summary.avgMemoryUsage?.toFixed(1)}%`);
    console.log(`Total Alerts: ${summary.totalAlerts}`);

    if (summary.endpoints) {
      console.log('\nEndpoint Performance:');
      Object.entries(summary.endpoints).forEach(([name, data]) => {
        console.log(
          `  ${name}: ${data.avgResponseTime.toFixed(0)}ms avg (${data.successRate.toFixed(1)}% success)`,
        );
      });
    }
  }

  // Helper methods
  extractResponseTime(response) {
    const responseTime = response.headers['x-response-time'];
    if (responseTime) {
      return parseFloat(responseTime.replace('ms', ''));
    }
    return null;
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
      external: usage.external,
    };
  }

  parsePrometheusMetric(metricsText, metricName) {
    // Simple Prometheus metric parser
    const regex = new RegExp(`${metricName}\\s+([0-9.]+)`);
    const match = metricsText.match(regex);
    return match ? parseFloat(match[1]) : null;
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.start();
}

module.exports = PerformanceMonitor;
