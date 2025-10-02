#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ScalabilityTestRunner {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      phases: [],
      summary: {},
      bottlenecks: [],
      recommendations: [],
    };
  }

  async run() {
    console.log('🚀 Starting Scalability Test Suite...');
    console.log(`Target: ${this.baseUrl}`);

    try {
      // Pre-test health check
      await this.preTestHealthCheck();

      // Run scalability test phases
      await this.runScalabilityPhases();

      // Analyze results and identify bottlenecks
      await this.analyzeBottlenecks();

      // Generate comprehensive report
      await this.generateReport();

      console.log('✅ Scalability testing completed!');
      this.printSummary();
    } catch (error) {
      console.error('❌ Scalability test failed:', error.message);
      process.exit(1);
    }
  }

  async preTestHealthCheck() {
    console.log('🔍 Performing pre-test health check...');

    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      console.log('✅ System is healthy, proceeding with scalability tests');
    } catch (error) {
      throw new Error(`System health check failed: ${error.message}`);
    }
  }

  async runScalabilityPhases() {
    console.log('📈 Running scalability test phases...');

    const phases = [
      { name: 'Baseline', users: 10, duration: 60 },
      { name: 'Light Load', users: 50, duration: 120 },
      { name: 'Medium Load', users: 100, duration: 180 },
      { name: 'Heavy Load', users: 200, duration: 240 },
      { name: 'Peak Load', users: 400, duration: 180 },
      { name: 'Stress Test', users: 600, duration: 120 },
    ];

    for (const phase of phases) {
      console.log(`\n🎯 Running ${phase.name} (${phase.users} users, ${phase.duration}s)`);

      const phaseResult = await this.runPhase(phase);
      this.results.phases.push(phaseResult);

      // Brief pause between phases
      await this.sleep(10000);
    }
  }

  async runPhase(phase) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Use autocannon for precise load testing
      const autocannon = spawn('npx', [
        'autocannon',
        '-c',
        phase.users.toString(),
        '-d',
        phase.duration.toString(),
        '--json',
        this.baseUrl + '/health',
      ]);

      let output = '';
      let errorOutput = '';

      autocannon.stdout.on('data', (data) => {
        output += data.toString();
      });

      autocannon.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      autocannon.on('close', (code) => {
        const endTime = Date.now();

        if (code !== 0) {
          console.error(`❌ ${phase.name} failed with code ${code}`);
          console.error('Error output:', errorOutput);
          reject(new Error(`Phase ${phase.name} failed`));
          return;
        }

        try {
          const result = JSON.parse(output);

          const phaseResult = {
            name: phase.name,
            config: phase,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            duration: endTime - startTime,
            results: {
              requests: result.requests,
              latency: result.latency,
              throughput: result.throughput,
              errors: result.errors,
              timeouts: result.timeouts,
              non2xx: result.non2xx,
            },
            performance: this.analyzePhasePerformance(result, phase),
            bottleneckIndicators: this.identifyPhaseBottlenecks(result, phase),
          };

          console.log(
            `   ✅ Completed: ${result.requests.average}/s avg, ${result.latency.average.toFixed(2)}ms latency`,
          );

          resolve(phaseResult);
        } catch (parseError) {
          console.error(`❌ Failed to parse results for ${phase.name}:`, parseError.message);
          reject(parseError);
        }
      });
    });
  }

  analyzePhasePerformance(result, phase) {
    const performance = {
      grade: 'A',
      issues: [],
      metrics: {
        avgLatency: result.latency.average,
        p95Latency: result.latency.p95,
        p99Latency: result.latency.p99,
        throughput: result.throughput.average,
        errorRate: (result.errors / result.requests.total) * 100,
        successRate: ((result.requests.total - result.errors) / result.requests.total) * 100,
      },
    };

    // Analyze performance degradation
    if (result.latency.average > 2000) {
      performance.grade = 'F';
      performance.issues.push('Critical latency degradation');
    } else if (result.latency.average > 1000) {
      performance.grade = performance.grade === 'A' ? 'C' : performance.grade;
      performance.issues.push('High latency detected');
    }

    if (performance.metrics.errorRate > 5) {
      performance.grade = 'F';
      performance.issues.push('High error rate');
    } else if (performance.metrics.errorRate > 1) {
      performance.grade = performance.grade === 'A' ? 'D' : performance.grade;
      performance.issues.push('Elevated error rate');
    }

    // Check throughput degradation
    const expectedThroughput = Math.min(phase.users * 0.5, 100); // Conservative estimate
    if (result.throughput.average < expectedThroughput * 0.5) {
      performance.grade = performance.grade === 'A' ? 'D' : performance.grade;
      performance.issues.push('Low throughput');
    }

    return performance;
  }

  identifyPhaseBottlenecks(result, phase) {
    const bottlenecks = [];

    // CPU bottleneck indicators
    if (result.latency.p99 > result.latency.average * 3) {
      bottlenecks.push({
        type: 'CPU_BOTTLENECK',
        severity: 'HIGH',
        indicator: 'High P99 latency variance',
        value: result.latency.p99,
        threshold: result.latency.average * 3,
      });
    }

    // Memory bottleneck indicators
    if (result.errors > 0 && result.latency.average > 1000) {
      bottlenecks.push({
        type: 'MEMORY_BOTTLENECK',
        severity: 'MEDIUM',
        indicator: 'Errors with high latency',
        errorCount: result.errors,
        avgLatency: result.latency.average,
      });
    }

    // Connection pool bottleneck
    if (result.timeouts > 0) {
      bottlenecks.push({
        type: 'CONNECTION_BOTTLENECK',
        severity: 'HIGH',
        indicator: 'Request timeouts detected',
        timeouts: result.timeouts,
      });
    }

    // Database bottleneck (inferred)
    if (result.latency.average > 500 && result.throughput.average < phase.users * 0.3) {
      bottlenecks.push({
        type: 'DATABASE_BOTTLENECK',
        severity: 'MEDIUM',
        indicator: 'High latency with low throughput',
        avgLatency: result.latency.average,
        throughput: result.throughput.average,
      });
    }

    return bottlenecks;
  }

  async analyzeBottlenecks() {
    console.log('🔍 Analyzing bottlenecks across all phases...');

    const allBottlenecks = this.results.phases.flatMap((phase) =>
      phase.bottleneckIndicators.map((b) => ({ ...b, phase: phase.name })),
    );

    // Group bottlenecks by type
    const bottleneckGroups = allBottlenecks.reduce((groups, bottleneck) => {
      if (!groups[bottleneck.type]) groups[bottleneck.type] = [];
      groups[bottleneck.type].push(bottleneck);
      return groups;
    }, {});

    // Analyze trends
    Object.entries(bottleneckGroups).forEach(([type, bottlenecks]) => {
      if (bottlenecks.length >= 2) {
        this.results.bottlenecks.push({
          type,
          frequency: bottlenecks.length,
          severity: this.calculateOverallSeverity(bottlenecks),
          phases: bottlenecks.map((b) => b.phase),
          recommendation: this.getBottleneckRecommendation(type),
        });
      }
    });

    // Performance degradation analysis
    this.analyzePerformanceDegradation();
  }

  analyzePerformanceDegradation() {
    const phases = this.results.phases;
    if (phases.length < 2) return;

    const baselineLatency = phases[0].results.latency.average;
    const baselineThroughput = phases[0].results.throughput.average;

    phases.forEach((phase, index) => {
      if (index === 0) return; // Skip baseline

      const latencyIncrease =
        ((phase.results.latency.average - baselineLatency) / baselineLatency) * 100;
      const throughputDecrease =
        ((baselineThroughput - phase.results.throughput.average) / baselineThroughput) * 100;

      if (latencyIncrease > 100) {
        // 100% increase in latency
        this.results.bottlenecks.push({
          type: 'PERFORMANCE_DEGRADATION',
          phase: phase.name,
          severity: 'HIGH',
          metric: 'latency',
          increase: latencyIncrease,
          recommendation: 'Investigate performance bottlenecks causing latency spikes',
        });
      }

      if (throughputDecrease > 50) {
        // 50% decrease in throughput
        this.results.bottlenecks.push({
          type: 'THROUGHPUT_DEGRADATION',
          phase: phase.name,
          severity: 'HIGH',
          metric: 'throughput',
          decrease: throughputDecrease,
          recommendation: 'Scale resources or optimize application performance',
        });
      }
    });
  }

  calculateOverallSeverity(bottlenecks) {
    const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const avgSeverity =
      bottlenecks.reduce((sum, b) => sum + severityLevels[b.severity], 0) / bottlenecks.length;

    if (avgSeverity >= 2.5) return 'HIGH';
    if (avgSeverity >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  getBottleneckRecommendation(type) {
    const recommendations = {
      CPU_BOTTLENECK: 'Scale CPU resources or optimize CPU-intensive operations',
      MEMORY_BOTTLENECK: 'Increase memory allocation or optimize memory usage',
      CONNECTION_BOTTLENECK: 'Increase connection pool size or optimize connection handling',
      DATABASE_BOTTLENECK: 'Optimize database queries, add indexes, or scale database resources',
    };

    return recommendations[type] || 'Investigate and optimize the identified bottleneck';
  }

  async generateReport() {
    console.log('📋 Generating scalability test report...');

    this.results.summary = this.generateSummary();
    this.results.recommendations = this.generateRecommendations();

    // Save detailed report
    const reportsDir = path.join(process.cwd(), 'test', 'performance', 'scalability-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `scalability-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`💾 Detailed report saved to: ${filepath}`);
  }

  generateSummary() {
    const phases = this.results.phases;
    const maxUsers = Math.max(...phases.map((p) => p.config.users));
    const maxThroughput = Math.max(...phases.map((p) => p.results.throughput.average));
    const minLatency = Math.min(...phases.map((p) => p.results.latency.average));
    const maxLatency = Math.max(...phases.map((p) => p.results.latency.average));

    const overallErrorRate =
      phases.reduce((sum, p) => {
        const errorRate = (p.results.errors / p.results.requests.total) * 100;
        return sum + errorRate;
      }, 0) / phases.length;

    return {
      maxConcurrentUsers: maxUsers,
      maxThroughput: maxThroughput,
      latencyRange: { min: minLatency, max: maxLatency },
      overallErrorRate: overallErrorRate,
      totalBottlenecks: this.results.bottlenecks.length,
      scalabilityGrade: this.calculateScalabilityGrade(),
      breakingPoint: this.findBreakingPoint(),
    };
  }

  calculateScalabilityGrade() {
    const criticalBottlenecks = this.results.bottlenecks.filter(
      (b) => b.severity === 'HIGH',
    ).length;
    const avgPerformanceGrade =
      this.results.phases.reduce((sum, p) => {
        const gradeValues = { A: 4, B: 3, C: 2, D: 1, F: 0 };
        return sum + gradeValues[p.performance.grade];
      }, 0) / this.results.phases.length;

    if (criticalBottlenecks > 2 || avgPerformanceGrade < 1) return 'F';
    if (criticalBottlenecks > 1 || avgPerformanceGrade < 2) return 'D';
    if (criticalBottlenecks > 0 || avgPerformanceGrade < 3) return 'C';
    if (avgPerformanceGrade < 3.5) return 'B';
    return 'A';
  }

  findBreakingPoint() {
    for (let i = 0; i < this.results.phases.length; i++) {
      const phase = this.results.phases[i];
      if (phase.performance.grade === 'F' || phase.performance.metrics.errorRate > 5) {
        return {
          phase: phase.name,
          users: phase.config.users,
          reason: phase.performance.issues.join(', '),
        };
      }
    }
    return null;
  }

  generateRecommendations() {
    const recommendations = [];

    // Based on bottlenecks
    this.results.bottlenecks.forEach((bottleneck) => {
      if (bottleneck.severity === 'HIGH') {
        recommendations.push({
          priority: 'HIGH',
          category: 'BOTTLENECK',
          issue: bottleneck.type,
          recommendation: bottleneck.recommendation,
        });
      }
    });

    // Based on overall performance
    if (this.results.summary.scalabilityGrade === 'F') {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'SCALABILITY',
        issue: 'Poor scalability performance',
        recommendation: 'Immediate performance optimization and infrastructure scaling required',
      });
    }

    // Based on breaking point
    if (this.results.summary.breakingPoint) {
      recommendations.push({
        priority: 'HIGH',
        category: 'CAPACITY',
        issue: `System breaks at ${this.results.summary.breakingPoint.users} concurrent users`,
        recommendation: 'Optimize performance or scale infrastructure before reaching this load',
      });
    }

    return recommendations;
  }

  printSummary() {
    console.log('\n🎯 SCALABILITY TEST SUMMARY');
    console.log('============================');
    console.log(`Max Concurrent Users Tested: ${this.results.summary.maxConcurrentUsers}`);
    console.log(`Max Throughput Achieved: ${this.results.summary.maxThroughput.toFixed(2)} req/s`);
    console.log(
      `Latency Range: ${this.results.summary.latencyRange.min.toFixed(2)}ms - ${this.results.summary.latencyRange.max.toFixed(2)}ms`,
    );
    console.log(`Overall Error Rate: ${this.results.summary.overallErrorRate.toFixed(2)}%`);
    console.log(`Scalability Grade: ${this.results.summary.scalabilityGrade}`);

    if (this.results.summary.breakingPoint) {
      console.log(
        `Breaking Point: ${this.results.summary.breakingPoint.users} users (${this.results.summary.breakingPoint.reason})`,
      );
    } else {
      console.log('Breaking Point: Not reached within test parameters');
    }

    console.log(`\nBottlenecks Identified: ${this.results.bottlenecks.length}`);
    this.results.bottlenecks.forEach((bottleneck) => {
      console.log(`  - ${bottleneck.type} (${bottleneck.severity}): ${bottleneck.recommendation}`);
    });
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (require.main === module) {
  const scalabilityTest = new ScalabilityTestRunner();
  scalabilityTest.run().catch(console.error);
}

module.exports = ScalabilityTestRunner;
