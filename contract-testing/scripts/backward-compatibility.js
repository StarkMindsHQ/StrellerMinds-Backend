#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { diff } = require('json-schema-diff');

async function checkBackwardCompatibility() {
  try {
    console.log('🔍 Checking backward compatibility...');
    
    const reportsDir = path.join(__dirname, '../reports');
    const currentSpecPath = path.join(reportsDir, 'current-openapi.json');
    const previousSpecPath = path.join(reportsDir, 'previous-openapi.json');
    
    // Ensure reports directory exists
    fs.mkdirSync(reportsDir, { recursive: true });
    
    // Try to load current spec
    let currentSpec;
    try {
      // Try to fetch from running server first
      const response = await fetch('http://localhost:3000/api/docs-json');
      if (response.ok) {
        currentSpec = await response.json();
        fs.writeFileSync(currentSpecPath, JSON.stringify(currentSpec, null, 2));
        console.log('📥 Current spec fetched from server');
      } else {
        throw new Error('Server not available');
      }
    } catch (error) {
      // Try to read from file
      if (fs.existsSync(currentSpecPath)) {
        currentSpec = JSON.parse(fs.readFileSync(currentSpecPath, 'utf8'));
        console.log('📥 Current spec loaded from file');
      } else {
        console.error('❌ Could not load current OpenAPI specification');
        console.log('   Please ensure the server is running or the current spec exists');
        process.exit(1);
      }
    }
    
    // Check if previous spec exists
    if (!fs.existsSync(previousSpecPath)) {
      console.log('ℹ️  No previous specification found. Creating baseline...');
      fs.writeFileSync(previousSpecPath, JSON.stringify(currentSpec, null, 2));
      console.log(`✅ Baseline created at: ${previousSpecPath}`);
      process.exit(0);
    }
    
    // Load previous spec
    const previousSpec = JSON.parse(fs.readFileSync(previousSpecPath, 'utf8'));
    
    console.log('📊 Comparing specifications...');
    
    // Perform compatibility check
    const compatibilityReport = {
      timestamp: new Date().toISOString(),
      currentVersion: currentSpec.info?.version || 'unknown',
      previousVersion: previousSpec.info?.version || 'unknown',
      breakingChanges: [],
      nonBreakingChanges: [],
      removedEndpoints: [],
      addedEndpoints: [],
      modifiedEndpoints: []
    };
    
    // Check for removed endpoints
    Object.keys(previousSpec.paths || {}).forEach(path => {
      if (!currentSpec.paths || !currentSpec.paths[path]) {
        compatibilityReport.removedEndpoints.push(path);
        compatibilityReport.breakingChanges.push({
          type: 'REMOVED_ENDPOINT',
          path,
          message: `Endpoint ${path} was removed`
        });
      } else {
        // Check for removed methods
        Object.keys(previousSpec.paths[path]).forEach(method => {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            if (!currentSpec.paths[path][method]) {
              compatibilityReport.breakingChanges.push({
                type: 'REMOVED_METHOD',
                path,
                method: method.toUpperCase(),
                message: `Method ${method.toUpperCase()} ${path} was removed`
              });
            }
          }
        });
      }
    });
    
    // Check for added endpoints
    Object.keys(currentSpec.paths || {}).forEach(path => {
      if (!previousSpec.paths || !previousSpec.paths[path]) {
        compatibilityReport.addedEndpoints.push(path);
        compatibilityReport.nonBreakingChanges.push({
          type: 'ADDED_ENDPOINT',
          path,
          message: `New endpoint ${path} was added`
        });
      } else {
        // Check for added methods
        Object.keys(currentSpec.paths[path]).forEach(method => {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            if (!previousSpec.paths[path][method]) {
              compatibilityReport.nonBreakingChanges.push({
                type: 'ADDED_METHOD',
                path,
                method: method.toUpperCase(),
                message: `New method ${method.toUpperCase()} ${path} was added`
              });
            } else {
              // Check for modifications
              const currentOp = currentSpec.paths[path][method];
              const previousOp = previousSpec.paths[path][method];
              
              if (JSON.stringify(currentOp) !== JSON.stringify(previousOp)) {
                compatibilityReport.modifiedEndpoints.push({
                  path,
                  method: method.toUpperCase(),
                  changes: detectOperationChanges(previousOp, currentOp)
                });
              }
            }
          }
        });
      }
    });
    
    // Analyze modified endpoints for breaking changes
    compatibilityReport.modifiedEndpoints.forEach(modification => {
      modification.changes.forEach(change => {
        if (change.breaking) {
          compatibilityReport.breakingChanges.push({
            type: 'MODIFIED_ENDPOINT',
            path: modification.path,
            method: modification.method,
            ...change
          });
        } else {
          compatibilityReport.nonBreakingChanges.push({
            type: 'MODIFIED_ENDPOINT',
            path: modification.path,
            method: modification.method,
            ...change
          });
        }
      });
    });
    
    // Generate report
    console.log('\n📋 Compatibility Report:');
    console.log(`   Current Version: ${compatibilityReport.currentVersion}`);
    console.log(`   Previous Version: ${compatibilityReport.previousVersion}`);
    
    if (compatibilityReport.breakingChanges.length > 0) {
      console.log(`\n❌ Breaking Changes (${compatibilityReport.breakingChanges.length}):`);
      compatibilityReport.breakingChanges.forEach(change => {
        console.log(`   - ${change.message}`);
      });
    }
    
    if (compatibilityReport.nonBreakingChanges.length > 0) {
      console.log(`\n✅ Non-Breaking Changes (${compatibilityReport.nonBreakingChanges.length}):`);
      compatibilityReport.nonBreakingChanges.forEach(change => {
        console.log(`   - ${change.message}`);
      });
    }
    
    // Save compatibility report
    const reportPath = path.join(reportsDir, 'compatibility-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(compatibilityReport, null, 2));
    
    console.log(`\n📄 Compatibility report saved to: ${reportPath}`);
    
    // Update previous spec for next comparison
    fs.writeFileSync(previousSpecPath, JSON.stringify(currentSpec, null, 2));
    
    // Exit with error code if breaking changes found
    if (compatibilityReport.breakingChanges.length > 0) {
      console.log('\n❌ Breaking changes detected! Please review before deploying.');
      process.exit(1);
    } else {
      console.log('\n✅ No breaking changes detected. API is backward compatible.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Backward compatibility check failed:');
    console.error(error.message);
    process.exit(1);
  }
}

function detectOperationChanges(previousOp, currentOp) {
  const changes = [];
  
  // Check response changes
  if (previousOp.responses && currentOp.responses) {
    Object.keys(previousOp.responses).forEach(statusCode => {
      if (!currentOp.responses[statusCode]) {
        changes.push({
          breaking: true,
          field: 'responses',
          change: 'REMOVED_STATUS_CODE',
          message: `Response status code ${statusCode} was removed`
        });
      }
    });
    
    Object.keys(currentOp.responses).forEach(statusCode => {
      if (!previousOp.responses[statusCode]) {
        changes.push({
          breaking: false,
          field: 'responses',
          change: 'ADDED_STATUS_CODE',
          message: `New response status code ${statusCode} was added`
        });
      }
    });
  }
  
  // Check parameter changes
  if (previousOp.parameters && currentOp.parameters) {
    const previousParams = previousOp.parameters.map(p => p.name + p.in);
    const currentParams = currentOp.parameters.map(p => p.name + p.in);
    
    previousParams.forEach(param => {
      if (!currentParams.includes(param)) {
        changes.push({
          breaking: true,
          field: 'parameters',
          change: 'REMOVED_PARAMETER',
          message: `Parameter ${param} was removed`
        });
      }
    });
    
    currentParams.forEach(param => {
      if (!previousParams.includes(param)) {
        changes.push({
          breaking: false,
          field: 'parameters',
          change: 'ADDED_PARAMETER',
          message: `New parameter ${param} was added`
        });
      }
    });
  }
  
  // Check request body changes
  if (previousOp.requestBody && !currentOp.requestBody) {
    changes.push({
      breaking: true,
      field: 'requestBody',
      change: 'REMOVED_REQUEST_BODY',
      message: 'Request body was removed'
    });
  } else if (!previousOp.requestBody && currentOp.requestBody) {
    changes.push({
      breaking: false,
      field: 'requestBody',
      change: 'ADDED_REQUEST_BODY',
      message: 'Request body was added'
    });
  }
  
  return changes;
}

if (require.main === module) {
  checkBackwardCompatibility();
}

module.exports = { checkBackwardCompatibility };
