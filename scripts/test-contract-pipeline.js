#!/usr/bin/env node

/**
 * Contract Testing Pipeline Test Script
 *
 * This script tests the complete contract testing pipeline to ensure
 * all components are working correctly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ContractPipelineTester {
  constructor() {
    this.projectRoot = process.cwd();
    this.testResults = {
      setup: false,
      contractTests: false,
      providerVerification: false,
      pactGeneration: false,
      cleanup: false,
    };
  }

  /**
   * Run a command and return success/failure
   */
  runCommand(command, description) {
    console.log(`\n🔄 ${description}...`);
    try {
      execSync(command, {
        stdio: 'pipe',
        cwd: this.projectRoot,
        timeout: 60000, // 60 second timeout
      });
      console.log(`✅ ${description} - SUCCESS`);
      return true;
    } catch (error) {
      console.log(`❌ ${description} - FAILED`);
      console.log(`Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if files exist
   */
  checkFiles(files, description) {
    console.log(`\n🔍 ${description}...`);
    let allExist = true;

    files.forEach((file) => {
      const filePath = path.resolve(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} - EXISTS`);
      } else {
        console.log(`❌ ${file} - MISSING`);
        allExist = false;
      }
    });

    return allExist;
  }

  /**
   * Test the complete pipeline
   */
  async testPipeline() {
    console.log('🧪 Testing Contract Testing Pipeline\n');
    console.log('='.repeat(50));

    // 1. Test setup
    console.log('\n📋 Step 1: Testing Setup');
    this.testResults.setup = this.runCommand('npm run pact:setup', 'Pact setup initialization');

    // 2. Check contract test files exist
    console.log('\n📋 Step 2: Checking Contract Test Files');
    const contractFiles = [
      'apps/backend/tests/contract/stellar.consumer.pact.test.ts',
      'apps/backend/tests/contract/email.consumer.pact.test.ts',
      'apps/backend/tests/contract/storage.consumer.pact.test.ts',
      'apps/backend/tests/contract/payment.consumer.pact.test.ts',
      'apps/backend/tests/contract/notification.consumer.pact.test.ts',
      'apps/backend/tests/contract/provider-verification.test.ts',
    ];

    const filesExist = this.checkFiles(contractFiles, 'Contract test files');

    // 3. Check configuration files
    console.log('\n📋 Step 3: Checking Configuration Files');
    const configFiles = [
      'jest.contract.config.js',
      '.pactrc',
      'scripts/pact-setup.js',
      'scripts/pact-ci-integration.sh',
      'apps/backend/tests/contract/setup.ts',
      'apps/backend/tests/contract/global-setup.ts',
      'apps/backend/tests/contract/global-teardown.ts',
    ];

    const configExists = this.checkFiles(configFiles, 'Configuration files');

    // 4. Test Jest configuration
    console.log('\n📋 Step 4: Testing Jest Configuration');
    const jestConfigWorks = this.runCommand(
      'npx jest --showConfig --config jest.contract.config.js',
      'Jest contract configuration validation',
    );

    // 5. Test contract tests (dry run)
    console.log('\n📋 Step 5: Testing Contract Tests (Dry Run)');
    const contractTestsWork = this.runCommand(
      'npm run test:contract -- --passWithNoTests',
      'Contract tests execution',
    );
    this.testResults.contractTests = contractTestsWork;

    // 6. Check if Pact files are generated
    console.log('\n📋 Step 6: Checking Pact File Generation');
    const pactsDir = path.join(this.projectRoot, 'pacts');
    const logsDir = path.join(this.projectRoot, 'logs');

    let pactsGenerated = false;
    if (fs.existsSync(pactsDir)) {
      const pactFiles = fs.readdirSync(pactsDir).filter((f) => f.endsWith('.json'));
      if (pactFiles.length > 0) {
        console.log(`✅ ${pactFiles.length} Pact files generated`);
        pactsGenerated = true;
      } else {
        console.log('❌ No Pact files generated');
      }
    } else {
      console.log('❌ Pacts directory not found');
    }
    this.testResults.pactGeneration = pactsGenerated;

    // 7. Test provider verification (dry run)
    console.log('\n📋 Step 7: Testing Provider Verification Setup');
    const providerVerificationWorks = this.runCommand(
      'npm run test:contract:provider -- --passWithNoTests',
      'Provider verification setup',
    );
    this.testResults.providerVerification = providerVerificationWorks;

    // 8. Test cleanup
    console.log('\n📋 Step 8: Testing Cleanup');
    this.testResults.cleanup = this.runCommand('npm run pact:cleanup', 'Pact cleanup');

    // Generate report
    this.generateReport(filesExist && configExists && jestConfigWorks);
  }

  /**
   * Generate test report
   */
  generateReport(allSetup) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 CONTRACT TESTING PIPELINE TEST REPORT');
    console.log('='.repeat(50));

    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(Boolean).length;

    console.log(`\nOverall Status: ${passedTests}/${totalTests} tests passed`);

    Object.entries(this.testResults).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${test}`);
    });

    console.log('\n📋 Test Results:');
    console.log(`   - Setup: ${this.testResults.setup ? '✅' : '❌'}`);
    console.log(`   - Contract Tests: ${this.testResults.contractTests ? '✅' : '❌'}`);
    console.log(
      `   - Provider Verification: ${this.testResults.providerVerification ? '✅' : '❌'}`,
    );
    console.log(`   - Pact Generation: ${this.testResults.pactGeneration ? '✅' : '❌'}`);
    console.log(`   - Cleanup: ${this.testResults.cleanup ? '✅' : '❌'}`);

    if (allSetup && passedTests === totalTests) {
      console.log('\n🎉 CONTRACT TESTING PIPELINE IS FULLY FUNCTIONAL!');
      console.log('\n📋 Next Steps:');
      console.log('   1. Configure your Pact Broker URL and token in .env');
      console.log('   2. Run: npm run test:contract');
      console.log('   3. Run: npm run pact:publish (to publish contracts)');
      console.log('   4. Run: npm run pact:verify (to verify provider)');
    } else {
      console.log('\n⚠️  CONTRACT TESTING PIPELINE NEEDS ATTENTION');
      console.log('\n🔧 Troubleshooting:');
      if (!this.testResults.setup) {
        console.log('   - Check if all dependencies are installed: npm install');
      }
      if (!this.testResults.contractTests) {
        console.log('   - Check contract test files for syntax errors');
        console.log('   - Ensure all required services are properly mocked');
      }
      if (!this.testResults.pactGeneration) {
        console.log('   - Check if Pact tests are running successfully');
        console.log('   - Verify Jest configuration is correct');
      }
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      overallStatus: `${passedTests}/${totalTests}`,
      allSetup,
      testResults: this.testResults,
      recommendations: this.getRecommendations(),
    };

    const reportPath = path.join(this.projectRoot, 'contract-pipeline-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Get recommendations based on test results
   */
  getRecommendations() {
    const recommendations = [];

    if (!this.testResults.setup) {
      recommendations.push('Run npm install to ensure all dependencies are installed');
    }

    if (!this.testResults.contractTests) {
      recommendations.push('Check contract test files for syntax errors');
      recommendations.push('Ensure all service dependencies are properly mocked');
    }

    if (!this.testResults.pactGeneration) {
      recommendations.push('Verify Jest configuration in jest.contract.config.js');
      recommendations.push('Check if contract tests are running without errors');
    }

    if (!this.testResults.providerVerification) {
      recommendations.push('Ensure provider verification test is properly configured');
    }

    if (recommendations.length === 0) {
      recommendations.push('Contract testing pipeline is ready for use!');
      recommendations.push('Configure Pact Broker credentials to enable publishing');
    }

    return recommendations;
  }
}

// CLI interface
if (require.main === module) {
  const tester = new ContractPipelineTester();
  tester.testPipeline().catch(console.error);
}

module.exports = ContractPipelineTester;
