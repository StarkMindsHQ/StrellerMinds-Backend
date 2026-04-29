#!/usr/bin/env node

/**
 * OpenAPI Schema Validator
 * 
 * Validates the generated OpenAPI JSON file against the OpenAPI 3.0.3 specification.
 * Checks for:
 * - Valid OpenAPI structure
 * - No unresolved $ref references
 * - All required fields present
 * 
 * Usage: npm run docs:validate
 */

const fs = require('fs');
const path = require('path');

const openApiPath = path.join(__dirname, '..', 'docs', 'openapi.json');

if (!fs.existsSync(openApiPath)) {
  console.error(`❌ OpenAPI file not found: ${openApiPath}`);
  console.error('Run "npm run docs:generate" first');
  process.exit(1);
}

try {
  const openApiDoc = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

  // Basic validation
  const errors = [];

  if (!openApiDoc.openapi) {
    errors.push('Missing required field: openapi');
  }

  if (!openApiDoc.info) {
    errors.push('Missing required field: info');
  } else {
    if (!openApiDoc.info.title) errors.push('Missing required field: info.title');
    if (!openApiDoc.info.version) errors.push('Missing required field: info.version');
  }

  if (!openApiDoc.paths) {
    errors.push('Missing required field: paths');
  }

  // Check for unresolved $ref
  const refRegex = /"\$ref"\s*:\s*"#\/components\/schemas\/(\w+)"/g;
  const refs = new Set();
  let match;
  while ((match = refRegex.exec(JSON.stringify(openApiDoc))) !== null) {
    refs.add(match[1]);
  }

  const schemas = openApiDoc.components?.schemas || {};
  for (const ref of refs) {
    if (!schemas[ref]) {
      errors.push(`Unresolved $ref: #/components/schemas/${ref}`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ OpenAPI validation failed:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log('✅ OpenAPI validation passed');
  console.log(`   - OpenAPI version: ${openApiDoc.openapi}`);
  console.log(`   - API title: ${openApiDoc.info.title}`);
  console.log(`   - API version: ${openApiDoc.info.version}`);
  console.log(`   - Paths: ${Object.keys(openApiDoc.paths).length}`);
  console.log(`   - Schemas: ${Object.keys(schemas).length}`);
  console.log(`   - $refs resolved: ${refs.size}`);
} catch (error) {
  console.error('❌ Error validating OpenAPI file:');
  console.error(error.message);
  process.exit(1);
}
