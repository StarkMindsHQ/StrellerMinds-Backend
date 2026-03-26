/**
 * Performance Benchmarking script for StrellerMinds-Backend.
 * Benchmarks specific critical endpoints using autocannon.
 */
const autocannon = require('autocannon');
const format = require('autocannon-reporter');

const TARGET = process.env.TARGET_URL || 'http://localhost:3000';

const benchmarks = [
  {
    name: 'Health Check (Liveness)',
    url: `${TARGET}/api/health`,
    method: 'GET',
    connections: 10,
    duration: 10,
  },
  {
    name: 'Health Check (Readiness)',
    url: `${TARGET}/api/health/ready`,
    method: 'GET',
    connections: 10,
    duration: 10,
  },
  {
    name: 'Search (High-Concurrency)',
    url: `${TARGET}/api/search`,
    method: 'POST',
    body: JSON.stringify({ query: 'blockchain education' }),
    headers: { 'Content-Type': 'application/json' },
    connections: 50,
    duration: 20,
  },
  {
    name: 'Course List (High-Concurrency)',
    url: `${TARGET}/api/courses?page=1&limit=10`,
    method: 'GET',
    connections: 50,
    duration: 20,
  },
];

async function runBenchmark(config) {
  console.log(`\n--- Starting Benchmark: ${config.name} ---`);
  console.log(`URL: ${config.url}`);
  
  const result = await autocannon(config);
  console.log(autocannon.format(result));
  
  // Custom threshold check (Optional)
  if (result.errors > 0) {
    console.error(`Benchmark ${config.name} had ${result.errors} errors.`);
  }
}

async function start() {
  console.log('--- Performance Benchmarking Suit ---');
  for (const config of benchmarks) {
    try {
      await runBenchmark(config);
    } catch (e) {
      console.error(`Error benchmarking ${config.name}:`, e.message);
    }
  }
}

start().catch(console.error);
