#!/usr/bin/env node

const SwaggerParser = require('@apidevtools/swagger-parser');
const fs = require('fs');
const path = require('path');

async function validateOpenAPISpec() {
  try {
    console.log('🔍 Validating OpenAPI specification...');
    
    // Try to load the OpenAPI spec from different possible locations
    const possiblePaths = [
      path.join(__dirname, '../../src/api/docs-json'),
      path.join(__dirname, '../../dist/api/docs-json'),
      'http://localhost:3000/api/docs-json'
    ];

    let api;
    let specPath;

    for (const possiblePath of possiblePaths) {
      try {
        if (possiblePath.startsWith('http')) {
          // Try to fetch from running server
          const response = await fetch(possiblePath);
          if (response.ok) {
            api = await response.json();
            specPath = possiblePath;
            break;
          }
        } else {
          // Try to read from file
          if (fs.existsSync(possiblePath)) {
            api = JSON.parse(fs.readFileSync(possiblePath, 'utf8'));
            specPath = possiblePath;
            break;
          }
        }
      } catch (error) {
        // Continue to next path
      }
    }

    if (!api) {
      console.error('❌ Could not load OpenAPI specification. Please ensure the server is running or the spec file exists.');
      process.exit(1);
    }

    // Validate the API specification
    const result = await SwaggerParser.validate(api);
    
    console.log('✅ OpenAPI specification is valid!');
    console.log(`📋 API Title: ${result.info.title}`);
    console.log(`📋 API Version: ${result.info.version}`);
    console.log(`📋 Total Endpoints: ${Object.keys(result.paths || {}).length}`);
    
    // Count endpoints by method
    const methodCounts = {};
    Object.values(result.paths || {}).forEach(pathSpec => {
      Object.keys(pathSpec).forEach(method => {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          methodCounts[method] = (methodCounts[method] || 0) + 1;
        }
      });
    });
    
    console.log('📊 Endpoint Distribution:');
    Object.entries(methodCounts).forEach(([method, count]) => {
      console.log(`   ${method.toUpperCase()}: ${count}`);
    });

    // Check for common issues
    const issues = [];
    
    // Check for missing operation IDs
    let missingOperationIds = 0;
    Object.values(result.paths || {}).forEach(pathSpec => {
      Object.values(pathSpec).forEach(operation => {
        if (typeof operation === 'object' && !operation.operationId) {
          missingOperationIds++;
        }
      });
    });
    
    if (missingOperationIds > 0) {
      issues.push(`${missingOperationIds} endpoints missing operation IDs`);
    }

    // Check for missing descriptions
    let missingDescriptions = 0;
    Object.values(result.paths || {}).forEach(pathSpec => {
      Object.values(pathSpec).forEach(operation => {
        if (typeof operation === 'object' && !operation.description) {
          missingDescriptions++;
        }
      });
    });
    
    if (missingDescriptions > 0) {
      issues.push(`${missingDescriptions} endpoints missing descriptions`);
    }

    // Check for missing tags
    let missingTags = 0;
    Object.values(result.paths || {}).forEach(pathSpec => {
      Object.values(pathSpec).forEach(operation => {
        if (typeof operation === 'object' && (!operation.tags || operation.tags.length === 0)) {
          missingTags++;
        }
      });
    });
    
    if (missingTags > 0) {
      issues.push(`${missingTags} endpoints missing tags`);
    }

    if (issues.length > 0) {
      console.log('\n⚠️  Warnings:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }

    // Generate validation report
    const report = {
      timestamp: new Date().toISOString(),
      valid: true,
      specPath,
      api: {
        title: result.info.title,
        version: result.info.version,
        endpoints: Object.keys(result.paths || {}).length,
        methodCounts
      },
      issues,
      recommendations: [
        'Add operation IDs for better client SDK generation',
        'Add descriptions for all endpoints',
        'Organize endpoints with appropriate tags',
        'Consider adding examples for request/response bodies'
      ]
    };

    // Save validation report
    const reportPath = path.join(__dirname, '../reports/openapi-validation.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Validation report saved to: ${reportPath}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ OpenAPI validation failed:');
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  validateOpenAPISpec();
}

module.exports = { validateOpenAPISpec };
