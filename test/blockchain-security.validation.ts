/**
 * Blockchain Security Validation Script
 * 
 * Comprehensive validation of all security criteria for Stellar secret key protection.
 * Run this script to verify all acceptance criteria are met.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BlockchainKeyValidationService } from '../src/security/services/blockchain-key-validation.service';

class BlockchainSecurityValidator {
  private validationService: BlockchainKeyValidationService;
  private passedTests = 0;
  private failedTests = 0;

  constructor() {
    this.validationService = new BlockchainKeyValidationService();
  }

  /**
   * Security Criteria 1: Remove actual secret key pattern from example
   */
  async testCriteria1_RemoveSecretKeyPattern(): Promise<boolean> {
    console.log('\n📋 Testing Criteria 1: Remove actual secret key pattern from example');
    console.log('=' .repeat(70));

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
  async testCriteria2_SecurePlaceholder(): Promise<boolean> {
    console.log('\n📋 Testing Criteria 2: Replace with secure placeholder');
    console.log('=' .repeat(70));

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

    // Test 2.2: Validate placeholder is rejected by service
    const placeholder = '<STEWARD_SECRET_KEY_PLACEHOLDER_REPLACE_IN_PRODUCTION>';
    const result = this.validationService.validateStellarSecretKey(placeholder);
    
    if (!result.valid && result.errors.some(e => e.toLowerCase().includes('placeholder') || e.toLowerCase().includes('length'))) {
      console.log('✅ PASS: Validation service correctly rejects placeholder keys');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Placeholder should be rejected by validation');
      this.failedTests++;
      return false;
    }

    return true;
  }

  /**
   * Security Criteria 3: Add blockchain security best practices
   */
  async testCriteria3_BestPractices(): Promise<boolean> {
    console.log('\n📋 Testing Criteria 3: Add blockchain security best practices');
    console.log('=' .repeat(70));

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
    if (envContent.includes('56 characters') && envContent.includes('S + 55')) {
      console.log('✅ PASS: Key format specifications documented');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Key format information missing');
      this.failedTests++;
      return false;
    }

    // Test 3.3: Service provides best practices programmatically
    const servicePractices = this.validationService.getSecurityBestPractices();
    if (servicePractices.length > 5 && 
        servicePractices.includes('Never commit real secret keys to version control')) {
      console.log('✅ PASS: Service provides comprehensive best practices');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Service best practices incomplete');
      this.failedTests++;
      return false;
    }

    return true;
  }

  /**
   * Security Criteria 4: Implement key validation service
   */
  async testCriteria4_KeyValidationService(): Promise<boolean> {
    console.log('\n📋 Testing Criteria 4: Implement key validation service');
    console.log('=' .repeat(70));

    // Test 4.1: Valid key format
    const validKey = 'SAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaAAAB';
    const validResult = this.validationService.validateStellarSecretKey(validKey);
    
    if (validResult.valid) {
      console.log('✅ PASS: Validates correct Stellar secret key format');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Should accept valid key format');
      this.failedTests++;
      return false;
    }

    // Test 4.2: Reject incorrect length
    const shortKey = 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const shortResult = this.validationService.validateStellarSecretKey(shortKey);
    
    if (!shortResult.valid && shortResult.errors.some(e => e.includes('length'))) {
      console.log('✅ PASS: Rejects keys with incorrect length');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Should reject incorrect length');
      this.failedTests++;
      return false;
    }

    // Test 4.3: Reject keys not starting with S
    const invalidKey = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const invalidResult = this.validationService.validateStellarSecretKey(invalidKey);
    
    if (!invalidResult.valid && invalidResult.errors.some(e => e.includes('start with "S"'))) {
      console.log('✅ PASS: Rejects keys not starting with S');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Should reject keys not starting with S');
      this.failedTests++;
      return false;
    }

    // Test 4.4: Reject lowercase
    const lowercaseKey = 'Saaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab';
    const lowerResult = this.validationService.validateStellarSecretKey(lowercaseKey);
    
    if (!lowerResult.valid) {
      console.log('✅ PASS: Rejects keys with lowercase letters');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Should reject lowercase keys');
      this.failedTests++;
      return false;
    }

    // Test 4.5: Detect insecure patterns
    const weakKey = 'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS';
    const weakResult = this.validationService.validateStellarSecretKey(weakKey);
    
    if (!weakResult.valid && weakResult.errors.some(e => e.includes('insecure pattern'))) {
      console.log('✅ PASS: Detects insecure key patterns');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Should detect insecure patterns');
      this.failedTests++;
      return false;
    }

    // Test 4.6: Public key validation
    const validPublicKey = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB';
    const pubResult = this.validationService.validateStellarPublicKey(validPublicKey);
    
    if (pubResult.valid) {
      console.log('✅ PASS: Validates public key format');
      this.passedTests++;
    } else {
      console.log('❌ FAIL: Should validate public key format');
      this.failedTests++;
      return false;
    }

    return true;
  }

  /**
   * Additional Test: README Security Updates
   */
  async testReadmeSecurityUpdates(): Promise<boolean> {
    console.log('\n📋 Testing: README.md Security Updates');
    console.log('=' .repeat(70));

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
  async runAllTests(): Promise<void> {
    console.log('\n' + '='.repeat(70));
    console.log('🔒 BLOCKCHAIN SECURITY VALIDATION - COMPREHENSIVE TEST SUITE');
    console.log('='.repeat(70));
    console.log('Testing all acceptance criteria for Stellar Secret Key Exposure fix');
    console.log('='.repeat(70));

    await this.testCriteria1_RemoveSecretKeyPattern();
    await this.testCriteria2_SecurePlaceholder();
    await this.testCriteria3_BestPractices();
    await this.testCriteria4_KeyValidationService();
    await this.testReadmeSecurityUpdates();

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.failedTests}`);
    console.log(`📈 Success Rate: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(2)}%`);
    console.log('='.repeat(70));

    if (this.failedTests === 0) {
      console.log('\n🎉 SUCCESS: All security criteria are working correctly!');
      console.log('✅ Stellar secret key exposure vulnerability has been fixed.');
      console.log('✅ Blockchain security best practices implemented.');
      console.log('✅ Key validation service operational.');
    } else {
      console.log('\n⚠️  WARNING: Some tests failed. Please review and fix the issues above.');
    }
    console.log('='.repeat(70) + '\n');
  }
}

// Run the validation
const validator = new BlockchainSecurityValidator();
validator.runAllTests().catch(console.error);
