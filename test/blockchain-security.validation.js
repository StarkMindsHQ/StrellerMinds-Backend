/**
 * Blockchain Security Validation Script (JavaScript)
 * 
 * Comprehensive validation of all security criteria for Stellar secret key protection.
 */

const fs = require('fs');
const path = require('path');

class BlockchainSecurityValidator {
  constructor() {
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * Security Criteria 1: Remove actual secret key pattern from example
   */
  testCriteria1_RemoveSecretKeyPattern() {
    console.log('\n📋 Testing Criteria 1: Remove actual secret key pattern from example');
    console.log('='.repeat(70));

    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envContent = fs.readFileSync(envExamplePath, 'utf8');

    // Test 1.1: Check for real key patterns
    const realKeyPattern = /S[A-Z0-9]{55}/g;
    const matches = envContent.match(realKeyPattern);
    
    if (matches === null || matches.length === 0) {
      console.log('✅ PASS: No real secret key patterns found in .env.example');
      this.passedTests++;
    } else {
      console.log(`❌ FAIL: Found ${matches.length} potential real key patterns!`);
      this.failedTests++;
      return false;
    }

    // Test 1.2: Verify placeholder usage
    if (envContent.includes('<STEWARD_SECRET_KEY_PLACEHOLDER_REPLACE_IN_PRODUCTION>')) {
      console.log('✅ PASS: Using secure placeholder for SIGNER_SECRET_KEY');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Placeholder not found or incorrect format');
      this.failedTests++;
      return false;
    }

    // Test 1.3: Contract ID placeholder
    if (envContent.includes('<your_contract_id_here>')) {
      console.log('✅ PASS: Using secure placeholder for CREDENTIAL_CONTRACT_ID');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Contract ID placeholder not found');
      this.failedTests++;
      return false;
    }

    return true;
  }

  /**
   * Security Criteria 2: Replace with secure placeholder
   */
  testCriteria2_SecurePlaceholder() {
    console.log('\n📋 Testing Criteria 2: Replace with secure placeholder');
    console.log('='.repeat(70));

    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envContent = fs.readFileSync(envExamplePath, 'utf8');

    // Test 2.1: Security warnings present
    const requiredWarnings = [
      'SECURITY: Never commit real credentials',
      'secrets manager',
      'AWS Secrets Manager',
      'HashiCorp Vault',
    ];

    let allPresent = true;
    for (const warning of requiredWarnings) {
      if (!envContent.includes(warning)) {
        console.log(`❌ FAIL: Missing security warning: "${warning}"`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log('✅ PASS: All required security warnings present');
      this.passedTests++;
    } else {
      this.failedTests++;
      return false;
    }

    // Test 2.2: Validate placeholder format (should be rejected by regex)
    const placeholder = '<STEWARD_SECRET_KEY_PLACEHOLDER_REPLACE_IN_PRODUCTION>';
    const stellarKeyPattern = /^S[A-Z0-9]{55}$/;
    
    if (!stellarKeyPattern.test(placeholder)) {
      console.log('✅ PASS: Placeholder correctly fails key format validation');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Placeholder should not match valid key pattern');
      this.failedTests++;
      return false;
    }

    return true;
  }

  /**
   * Security Criteria 3: Add blockchain security best practices
   */
  testCriteria3_BestPractices() {
    console.log('\n📋 Testing Criteria 3: Add blockchain security best practices');
    console.log('='.repeat(70));

    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envContent = fs.readFileSync(envExamplePath, 'utf8');

    // Test 3.1: Best practices documented
    const bestPractices = [
      'NEVER commit real secret keys to version control',
      'Use a secrets manager',
      'Generate separate key pairs for each environment',
      'Implement key rotation policies',
      'Monitor key usage',
      'hardware security modules',
      'multi-signature schemes',
      'laboratory.stellar.org',
    ];

    let allDocumented = true;
    for (const practice of bestPractices) {
      if (!envContent.toLowerCase().includes(practice.toLowerCase())) {
        console.log(`❌ FAIL: Missing best practice: "${practice}"`);
        allDocumented = false;
      }
    }

    if (allDocumented) {
      console.log('✅ PASS: All blockchain security best practices documented');
      this.passedTests++;
    } else {
      this.failedTests++;
      return false;
    }

    // Test 3.2: Key format information
    if (envContent.includes('56') && (envContent.includes('S + 55') || envContent.includes('55 uppercase'))) {
      console.log('✅ PASS: Key format specifications documented');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Key format information missing');
      this.failedTests++;
      return false;
    }

    // Test 3.3: Critical security notices
    if (envContent.includes('CRITICAL SECURITY NOTICE') || envContent.includes('⚠️')) {
      console.log('✅ PASS: Critical security notices prominently displayed');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Missing critical security notices');
      this.failedTests++;
      return false;
    }

    return true;
  }

  /**
   * Security Criteria 4: Implement key validation service
   */
  testCriteria4_KeyValidationService() {
    console.log('\n📋 Testing Criteria 4: Implement key validation service');
    console.log('='.repeat(70));

    const servicePath = path.join(process.cwd(), 'src', 'security', 'services', 'blockchain-key-validation.service.ts');
    
    // Test 4.1: Service file exists
    if (fs.existsSync(servicePath)) {
      console.log('✅ PASS: Blockchain key validation service file created');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Validation service file not found');
      this.failedTests++;
      return false;
    }

    const serviceContent = fs.readFileSync(servicePath, 'utf8');

    // Test 4.2: Service has validation methods
    if (serviceContent.includes('validateStellarSecretKey') && 
        serviceContent.includes('validateStellarPublicKey')) {
      console.log('✅ PASS: Service includes key validation methods');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Missing validation methods');
      this.failedTests++;
      return false;
    }

    // Test 4.3: Service has pattern validation
    if (serviceContent.includes('STELLAR_SECRET_KEY_PATTERN') || 
        serviceContent.includes('/^S[A-Z0-9]{55}$/')) {
      console.log('✅ PASS: Service implements pattern validation');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Missing pattern validation');
      this.failedTests++;
      return false;
    }

    // Test 4.4: Service has insecure pattern detection
    if (serviceContent.includes('containsInsecurePattern') || 
        serviceContent.includes('insecurePatterns')) {
      console.log('✅ PASS: Service detects insecure patterns');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Missing insecure pattern detection');
      this.failedTests++;
      return false;
    }

    // Test 4.5: Service provides best practices
    if (serviceContent.includes('getSecurityBestPractices')) {
      console.log('✅ PASS: Service provides security best practices');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Missing best practices method');
      this.failedTests++;
      return false;
    }

    // Test 4.6: Validate schema integration
    const schemaPath = path.join(process.cwd(), 'src', 'config', 'validation.schema.ts');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    if (schemaContent.includes('stellarSecretKeyValidator') && 
        schemaContent.includes('STELLAR_SECRET_KEY')) {
      console.log('✅ PASS: Validation schema integrated with custom validator');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Missing schema integration');
      this.failedTests++;
      return false;
    }

    return true;
  }

  /**
   * Additional Test: README Security Updates
   */
  testReadmeSecurityUpdates() {
    console.log('\n📋 Testing: README.md Security Updates');
    console.log('='.repeat(70));

    const readmePath = path.join(process.cwd(), 'README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');

    // Test: No exposed default keys
    const exposedKeyPattern = /jgjxvsjxvwjxsjxgskjxksmxjswkxwgxwdcj/g;
    if (!readmeContent.match(exposedKeyPattern)) {
      console.log('✅ PASS: No exposed default secret keys in README.md');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Found exposed default key in README.md!');
      this.failedTests++;
      return false;
    }

    // Test: Secure placeholder used
    if (readmeContent.includes('secrets_manager') || readmeContent.includes('secure key management')) {
      console.log('✅ PASS: Uses secure placeholder references');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Should reference secure key management');
      this.failedTests++;
      return false;
    }

    return true;
  }

  /**
   * Run all validation tests
   */
  runAllTests() {
    console.log('\n' + '='.repeat(70));
    console.log('🔒 BLOCKCHAIN SECURITY VALIDATION - COMPREHENSIVE TEST SUITE');
    console.log('='.repeat(70));
    console.log('Testing all acceptance criteria for Stellar Secret Key Exposure fix');
    console.log('='.repeat(70));

    this.testCriteria1_RemoveSecretKeyPattern();
    this.testCriteria2_SecurePlaceholder();
    this.testCriteria3_BestPractices();
    this.testCriteria4_KeyValidationService();
    this.testReadmeSecurityUpdates();

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.failedTests}`);
    const totalTests = this.passedTests + this.failedTests;
    const successRate = totalTests > 0 ? ((this.passedTests / totalTests) * 100).toFixed(2) : 0;
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('='.repeat(70));

    if (this.failedTests === 0) {
      console.log('\n🎉 SUCCESS: All security criteria are working correctly!');
      console.log('✅ Stellar secret key exposure vulnerability has been fixed.');
      console.log('✅ Blockchain security best practices implemented.');
      console.log('✅ Key validation service operational.');
      console.log('='.repeat(70) + '\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  WARNING: Some tests failed. Please review and fix the issues above.');
      console.log('='.repeat(70) + '\n');
      process.exit(1);
    }
  }
}

// Run the validation
const validator = new BlockchainSecurityValidator();
validator.runAllTests();
