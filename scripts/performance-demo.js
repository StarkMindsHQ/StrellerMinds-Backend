#!/usr/bin/env node

const { spawn } = require('child_process');
const axios = require('axios');

class PerformanceDemoRunner {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.steps = [
      { name: 'Health Check', action: () => this.healthCheck() },
      { name: 'Create Baseline', action: () => this.createBaseline() },
      { name: 'Quick Load Test', action: () => this.runQuickLoadTest() },
      { name: 'Performance Monitoring', action: () => this.startMonitoring() },
      { name: 'Stress Test', action: () => this.runStressTest() },
      { name: 'Generate Report', action: () => this.generateReport() },
    ];
  }

  async run() {
    console.log('🚀 StrellerMinds Performance Monitoring Demo');
    console.log('===========================================');
    console.log(`Target: ${this.baseUrl}`);
    console.log('');

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      console.log(`\n📋 Step ${i + 1}/${this.steps.length}: ${step.name}`);
      console.log('─'.repeat(50));

      try {
        await step.action();
        console.log(`✅ ${step.name} completed successfully`);
      } catch (error) {
        console.error(`❌ ${step.name} failed:`, error.message);

        // Continue with demo even if some steps fail
        if (step.name === 'Health Check') {
          console.log('⚠️  Application may not be running. Some steps may fail.');
        }
      }

      // Brief pause between steps
      await this.sleep(2000);
    }

    console.log('\n🎉 Performance Monitoring Demo Completed!');
    this.printSummary();
  }

  async healthCheck() {
    console.log('🔍 Checking application health...');

    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);

      if (response.status === 200) {
        console.log('   ✅ Application is healthy and ready for testing');
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Application is not running. Please start the application first.');
      }
      throw error;
    }
  }

  async createBaseline() {
    console.log('📋 Creating performance baseline...');

    return new Promise((resolve, reject) => {
      const baseline = spawn('node', ['scripts/performance-baseline.js'], {
        stdio: 'inherit',
        env: { ...process.env, API_BASE_URL: this.baseUrl },
      });

      baseline.on('close', (code) => {
        if (code === 0) {
          console.log('   ✅ Performance baseline created successfully');
          resolve();
        } else {
          reject(new Error(`Baseline creation failed with code ${code}`));
        }
      });

      baseline.on('error', (error) => {
        reject(new Error(`Failed to start baseline creation: ${error.message}`));
      });
    });
  }

  async runQuickLoadTest() {
    console.log('🔥 Running quick load test...');

    return new Promise((resolve, reject) => {
      const loadTest = spawn(
        'npx',
        ['artillery', 'quick', '--count', '20', '--num', '5', `${this.baseUrl}/health`],
        {
          stdio: 'inherit',
        },
      );

      loadTest.on('close', (code) => {
        if (code === 0) {
          console.log('   ✅ Quick load test completed');
          resolve();
        } else {
          console.log('   ⚠️  Load test completed with warnings');
          resolve(); // Continue demo even if load test has issues
        }
      });

      loadTest.on('error', (error) => {
        console.log('   ⚠️  Artillery not available, skipping load test');
        resolve(); // Continue demo
      });
    });
  }

  async startMonitoring() {
    console.log('📊 Starting performance monitoring (30 seconds)...');

    return new Promise((resolve, reject) => {
      const monitor = spawn('timeout', ['30', 'node', 'scripts/performance-monitor.js'], {
        stdio: 'inherit',
        env: { ...process.env, API_BASE_URL: this.baseUrl, MONITORING_INTERVAL: '5000' },
      });

      monitor.on('close', (code) => {
        console.log('   ✅ Performance monitoring session completed');
        resolve();
      });

      monitor.on('error', (error) => {
        console.log('   ⚠️  Monitoring session ended');
        resolve(); // Continue demo
      });
    });
  }

  async runStressTest() {
    console.log('💪 Running stress test...');

    return new Promise((resolve, reject) => {
      const stressTest = spawn(
        'npx',
        ['autocannon', '-c', '50', '-d', '15', `${this.baseUrl}/health`],
        {
          stdio: 'inherit',
        },
      );

      stressTest.on('close', (code) => {
        if (code === 0) {
          console.log('   ✅ Stress test completed');
        } else {
          console.log('   ⚠️  Stress test completed with warnings');
        }
        resolve();
      });

      stressTest.on('error', (error) => {
        console.log('   ⚠️  Autocannon not available, skipping stress test');
        resolve(); // Continue demo
      });
    });
  }

  async generateReport() {
    console.log('📊 Generating performance report...');

    return new Promise((resolve, reject) => {
      const report = spawn('node', ['scripts/performance-report.js'], {
        stdio: 'inherit',
        env: { ...process.env, API_BASE_URL: this.baseUrl },
      });

      report.on('close', (code) => {
        if (code === 0) {
          console.log('   ✅ Performance report generated successfully');
          resolve();
        } else {
          console.log('   ⚠️  Report generation completed with warnings');
          resolve(); // Continue demo
        }
      });

      report.on('error', (error) => {
        console.log('   ⚠️  Report generation encountered issues');
        resolve(); // Continue demo
      });
    });
  }

  printSummary() {
    console.log('\n📊 DEMO SUMMARY');
    console.log('================');
    console.log('The following performance monitoring capabilities were demonstrated:');
    console.log('');
    console.log('✅ Health Monitoring');
    console.log('   - Application health checks');
    console.log('   - System status validation');
    console.log('');
    console.log('✅ Performance Baselines');
    console.log('   - Baseline creation and storage');
    console.log('   - Performance standards establishment');
    console.log('');
    console.log('✅ Load Testing');
    console.log('   - Quick load testing with Artillery');
    console.log('   - Concurrent user simulation');
    console.log('');
    console.log('✅ Real-time Monitoring');
    console.log('   - Live performance metrics collection');
    console.log('   - Response time and throughput tracking');
    console.log('');
    console.log('✅ Stress Testing');
    console.log('   - High-load performance testing');
    console.log('   - System limit identification');
    console.log('');
    console.log('✅ Performance Reporting');
    console.log('   - Comprehensive report generation');
    console.log('   - Multi-format output (HTML, JSON, Markdown)');
    console.log('');
    console.log('📁 Generated Files:');
    console.log('   - test/performance/baselines/baseline-*.json');
    console.log('   - test/performance/monitoring-reports/monitoring-*.json');
    console.log('   - test/performance/reports/performance-report-*.html');
    console.log('   - test/performance/reports/performance-report-*.json');
    console.log('   - test/performance/reports/performance-report-*.md');
    console.log('');
    console.log('🔧 Available Commands:');
    console.log('   npm run load:test              - Run full load test suite');
    console.log('   npm run load:test:quick        - Quick health check load test');
    console.log('   npm run perf:baseline          - Create performance baseline');
    console.log('   npm run perf:monitor           - Start performance monitoring');
    console.log('   npm run perf:report            - Generate performance report');
    console.log('   npm run stress:test            - Run stress test');
    console.log('   node scripts/scalability-test.js - Run scalability test');
    console.log('');
    console.log('📚 Documentation:');
    console.log('   - docs/performance-monitoring.md - Complete documentation');
    console.log('   - API endpoints available at /performance/*');
    console.log('   - Swagger documentation at /api');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Review generated reports');
    console.log('   2. Set up continuous monitoring');
    console.log('   3. Integrate with CI/CD pipeline');
    console.log('   4. Configure alerting thresholds');
    console.log('   5. Schedule regular performance tests');
    console.log('');
    console.log('Thank you for trying the StrellerMinds Performance Monitoring System! 🚀');
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ASCII Art Banner
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███████╗████████╗██████╗ ███████╗██╗     ██╗     ███████╗██████╗  ║
║   ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║     ██║     ██╔════╝██╔══██╗ ║
║   ███████╗   ██║   ██████╔╝█████╗  ██║     ██║     █████╗  ██████╔╝ ║
║   ╚════██║   ██║   ██╔══██╗██╔══╝  ██║     ██║     ██╔══╝  ██╔══██╗ ║
║   ███████║   ██║   ██║  ██║███████╗███████╗███████╗███████╗██║  ██║ ║
║   ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝ ║
║                                                               ║
║              Performance Monitoring & Load Testing            ║
║                           Demo System                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Run if called directly
if (require.main === module) {
  const demo = new PerformanceDemoRunner();
  demo.run().catch(console.error);
}

module.exports = PerformanceDemoRunner;
