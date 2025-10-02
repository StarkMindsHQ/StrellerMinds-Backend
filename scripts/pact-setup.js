#!/usr/bin/env node

/**
 * Pact Contract Testing Setup Script
 *
 * This script helps set up Pact contract testing environment
 * and provides utilities for managing contracts and broker integration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PactSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.pactsDir = path.join(this.projectRoot, 'pacts');
    this.logsDir = path.join(this.projectRoot, 'logs');
    this.contractsDir = path.join(this.projectRoot, 'apps/backend/tests/contract');
  }

  /**
   * Initialize Pact testing environment
   */
  async initialize() {
    console.log('🚀 Initializing Pact Contract Testing Environment...\n');

    // Create necessary directories
    this.createDirectories();

    // Check dependencies
    this.checkDependencies();

    // Validate configuration
    this.validateConfiguration();

    // Run initial tests
    this.runInitialTests();

    console.log('✅ Pact Contract Testing Environment initialized successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Configure your Pact Broker URL and token in .env');
    console.log('   2. Run: npm run test:contract');
    console.log('   3. Run: npm run pact:publish (to publish contracts)');
    console.log('   4. Run: npm run pact:verify (to verify provider)');
  }

  /**
   * Create necessary directories for Pact testing
   */
  createDirectories() {
    console.log('📁 Creating directories...');

    const dirs = [this.pactsDir, this.logsDir];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✓ Created: ${dir}`);
      } else {
        console.log(`   ✓ Exists: ${dir}`);
      }
    });
  }

  /**
   * Check if required dependencies are installed
   */
  checkDependencies() {
    console.log('\n🔍 Checking dependencies...');

    const requiredPackages = ['@pact-foundation/pact', '@pact-foundation/pact-node'];

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'),
    );

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    requiredPackages.forEach((pkg) => {
      if (allDeps[pkg]) {
        console.log(`   ✓ ${pkg}: ${allDeps[pkg]}`);
      } else {
        console.log(`   ❌ ${pkg}: Missing`);
        console.log(`   💡 Run: npm install --save-dev ${pkg}`);
      }
    });
  }

  /**
   * Validate Pact configuration
   */
  validateConfiguration() {
    console.log('\n⚙️  Validating configuration...');

    // Check for .env file
    const envFile = path.join(this.projectRoot, '.env');
    if (fs.existsSync(envFile)) {
      console.log('   ✓ .env file exists');

      const envContent = fs.readFileSync(envFile, 'utf8');
      const requiredVars = ['PACT_BROKER_URL', 'PACT_BROKER_TOKEN'];

      requiredVars.forEach((varName) => {
        if (envContent.includes(varName)) {
          console.log(`   ✓ ${varName} is configured`);
        } else {
          console.log(`   ⚠️  ${varName} is not configured`);
        }
      });
    } else {
      console.log('   ⚠️  .env file not found');
      console.log('   💡 Create .env file with Pact Broker configuration');
    }

    // Check for .pactrc file
    const pactrcFile = path.join(this.projectRoot, '.pactrc');
    if (fs.existsSync(pactrcFile)) {
      console.log('   ✓ .pactrc file exists');
    } else {
      console.log('   ⚠️  .pactrc file not found');
    }

    // Check contract test files
    if (fs.existsSync(this.contractsDir)) {
      const contractFiles = fs
        .readdirSync(this.contractsDir)
        .filter((file) => file.endsWith('.pact.test.ts'));

      console.log(`   ✓ Found ${contractFiles.length} contract test files:`);
      contractFiles.forEach((file) => {
        console.log(`     - ${file}`);
      });
    } else {
      console.log('   ❌ Contract test directory not found');
    }
  }

  /**
   * Run initial contract tests
   */
  runInitialTests() {
    console.log('\n🧪 Running initial contract tests...');

    try {
      // Check if Jest is available
      execSync('npx jest --version', { stdio: 'pipe' });
      console.log('   ✓ Jest is available');

      // Try to run contract tests
      console.log('   🔄 Running contract tests...');
      execSync('npm run test:contract', {
        stdio: 'pipe',
        cwd: this.projectRoot,
      });
      console.log('   ✓ Contract tests passed');
    } catch (error) {
      console.log('   ⚠️  Contract tests failed or Jest not available');
      console.log('   💡 Make sure to install dependencies: npm install');
    }
  }

  /**
   * Clean up Pact artifacts
   */
  cleanup() {
    console.log('🧹 Cleaning up Pact artifacts...');

    const dirs = [this.pactsDir, this.logsDir];

    dirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          const filePath = path.join(dir, file);
          fs.unlinkSync(filePath);
          console.log(`   ✓ Removed: ${filePath}`);
        });
      }
    });

    console.log('✅ Cleanup completed');
  }

  /**
   * Validate contracts against broker
   */
  validateContracts() {
    console.log('🔍 Validating contracts against broker...');

    try {
      execSync('npm run pact:can-i-deploy', {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });
      console.log('✅ Contracts validation passed');
    } catch (error) {
      console.log('❌ Contracts validation failed');
      console.log('💡 Check your Pact Broker configuration and contracts');
    }
  }

  /**
   * Publish contracts to broker
   */
  publishContracts() {
    console.log('📤 Publishing contracts to broker...');

    try {
      execSync('npm run pact:publish', {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });
      console.log('✅ Contracts published successfully');
    } catch (error) {
      console.log('❌ Failed to publish contracts');
      console.log('💡 Check your Pact Broker URL and token');
    }
  }
}

// CLI interface
if (require.main === module) {
  const setup = new PactSetup();
  const command = process.argv[2];

  switch (command) {
    case 'init':
      setup.initialize();
      break;
    case 'cleanup':
      setup.cleanup();
      break;
    case 'validate':
      setup.validateContracts();
      break;
    case 'publish':
      setup.publishContracts();
      break;
    default:
      console.log('Pact Contract Testing Setup Script\n');
      console.log('Usage: node scripts/pact-setup.js <command>\n');
      console.log('Commands:');
      console.log('  init      - Initialize Pact testing environment');
      console.log('  cleanup   - Clean up Pact artifacts');
      console.log('  validate  - Validate contracts against broker');
      console.log('  publish   - Publish contracts to broker');
      break;
  }
}

module.exports = PactSetup;
