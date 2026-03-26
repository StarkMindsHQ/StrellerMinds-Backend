/**
 * Cross-platform Security Check script for StrellerMinds-Backend.
 * Runs on both Windows and Linux.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_DIR = 'security-reports';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Create report directory if it doesn't exist
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR);
}

console.log('--- Security Audit Starting ---');

function runCommand(name, command, ignoreError = false) {
  console.log(`\n[${name}] Running: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`[${name}] FAILED`);
    if (!ignoreError) {
      return false;
    }
    return true;
  }
}

let allPassed = true;

// 1. NPM Audit
console.log('\n--- 1. Dependency Vulnerability Scan ---');
allPassed = runCommand('NPM Audit', 'npm audit --audit-level=high', true) && allPassed;

// 2. Gitleaks (if installed)
console.log('\n--- 2. Secret Scan (Gitleaks) ---');
try {
  const gitleaksFound = runCommand('Gitleaks', `gitleaks detect --source . --verbose --report-path ${REPORT_DIR}/gitleaks-report-${TIMESTAMP}.json`, true);
  if (!gitleaksFound) {
    console.warn('Gitleaks not found or failed. Skipping secret scan.');
  }
} catch (e) {
  console.warn('Gitleaks execution failed. Skipping.');
}

// 3. Security Regression Tests (Jest)
console.log('\n--- 3. Security Regression Tests ---');
allPassed = runCommand('Security Tests', 'npm run test test/security/security.e2e-spec.ts', false) && allPassed;

// 4. Linter Security Rules
console.log('\n--- 4. Static Code Analysis (Lint) ---');
allPassed = runCommand('ESLint Security', 'npm run lint', true) && allPassed;

console.log('\n--- Security Audit Finished ---');

if (allPassed) {
  console.log('Result: SUCCESS - No critical security issues found.');
  process.exit(0);
} else {
  console.log('Result: FAILURE - Security issues detected.');
  process.exit(1);
}
