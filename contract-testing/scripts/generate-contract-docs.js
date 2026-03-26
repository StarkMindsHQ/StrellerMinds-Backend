#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function generateContractDocs() {
  try {
    console.log('📚 Generating API contract documentation...');
    
    const reportsDir = path.join(__dirname, '../reports');
    const docsDir = path.join(__dirname, '../docs');
    
    // Ensure directories exist
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.mkdirSync(docsDir, { recursive: true });
    
    // Load OpenAPI spec
    let apiSpec;
    try {
      const response = await fetch('http://localhost:3000/api/docs-json');
      if (response.ok) {
        apiSpec = await response.json();
        console.log('📥 API spec fetched from server');
      } else {
        throw new Error('Server not available');
      }
    } catch (error) {
      console.log('⚠️  Server not available, using placeholder data');
      apiSpec = {
        openapi: '3.0.0',
        info: { title: 'StrellerMinds API', version: '1.0.0' },
        paths: {}
      };
    }
    
    // Generate comprehensive documentation
    const documentation = {
      generated: new Date().toISOString(),
      api: {
        title: apiSpec.info?.title || 'StrellerMinds API',
        version: apiSpec.info?.version || '1.0.0',
        description: apiSpec.info?.description || 'API documentation'
      },
      endpoints: analyzeEndpoints(apiSpec),
      schemas: analyzeSchemas(apiSpec),
      security: analyzeSecurity(apiSpec),
      recommendations: generateRecommendations(apiSpec)
    };
    
    // Save documentation
    const docsPath = path.join(docsDir, 'contract-documentation.json');
    fs.writeFileSync(docsPath, JSON.stringify(documentation, null, 2));
    
    // Generate markdown documentation
    const markdownDocs = generateMarkdownDocumentation(documentation);
    const markdownPath = path.join(docsDir, 'CONTRACT_DOCUMENTATION.md');
    fs.writeFileSync(markdownPath, markdownDocs);
    
    console.log('✅ Contract documentation generated successfully!');
    console.log(`📄 JSON documentation: ${docsPath}`);
    console.log(`📄 Markdown documentation: ${markdownPath}`);
    
  } catch (error) {
    console.error('❌ Documentation generation failed:');
    console.error(error.message);
    process.exit(1);
  }
}

function analyzeEndpoints(apiSpec) {
  const endpoints = [];
  const paths = apiSpec.paths || {};
  
  Object.keys(paths).forEach(path => {
    Object.keys(paths[path]).forEach(method => {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        const operation = paths[path][method];
        endpoints.push({
          path,
          method: method.toUpperCase(),
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags || [],
          parameters: operation.parameters || [],
          requestBody: operation.requestBody,
          responses: operation.responses || {},
          security: operation.security || [],
          deprecated: operation.deprecated || false
        });
      }
    });
  });
  
  return {
    total: endpoints.length,
    byMethod: groupBy(endpoints, 'method'),
    byTag: groupBy(endpoints, 'tags'),
    details: endpoints
  };
}

function analyzeSchemas(apiSpec) {
  const schemas = apiSpec.components?.schemas || {};
  
  return {
    total: Object.keys(schemas).length,
    details: Object.keys(schemas).map(name => ({
      name,
      type: schemas[name].type,
      properties: Object.keys(schemas[name].properties || {}),
      required: schemas[name].required || []
    }))
  };
}

function analyzeSecurity(apiSpec) {
  const securitySchemes = apiSpec.components?.securitySchemes || {};
  
  return {
    schemes: Object.keys(securitySchemes).map(name => ({
      name,
      type: securitySchemes[name].type,
      description: securitySchemes[name].description
    })),
    globalSecurity: apiSpec.security || []
  };
}

function generateRecommendations(apiSpec) {
  const recommendations = [];
  const paths = apiSpec.paths || {};
  
  // Check for missing operation IDs
  let missingOperationIds = 0;
  Object.values(paths).forEach(pathSpec => {
    Object.values(pathSpec).forEach(operation => {
      if (typeof operation === 'object' && !operation.operationId) {
        missingOperationIds++;
      }
    });
  });
  
  if (missingOperationIds > 0) {
    recommendations.push({
      type: 'improvement',
      priority: 'medium',
      message: `Add operation IDs to ${missingOperationIds} endpoints for better client SDK generation`
    });
  }
  
  // Check for missing descriptions
  let missingDescriptions = 0;
  Object.values(paths).forEach(pathSpec => {
    Object.values(pathSpec).forEach(operation => {
      if (typeof operation === 'object' && !operation.description) {
        missingDescriptions++;
      }
    });
  });
  
  if (missingDescriptions > 0) {
    recommendations.push({
      type: 'improvement',
      priority: 'high',
      message: `Add descriptions to ${missingDescriptions} endpoints for better documentation`
    });
  }
  
  // Check for examples
  let endpointsWithoutExamples = 0;
  Object.values(paths).forEach(pathSpec => {
    Object.values(pathSpec).forEach(operation => {
      if (typeof operation === 'object') {
        const hasExamples = Object.values(operation.responses || {}).some(response => {
          return response.content && Object.values(response.content).some(content => content.example);
        });
        if (!hasExamples) {
          endpointsWithoutExamples++;
        }
      }
    });
  });
  
  if (endpointsWithoutExamples > 0) {
    recommendations.push({
      type: 'enhancement',
      priority: 'medium',
      message: `Add examples to ${endpointsWithoutExamples} endpoints for better developer experience`
    });
  }
  
  return recommendations;
}

function groupBy(array, key) {
  const grouped = {};
  array.forEach(item => {
    const groupKey = Array.isArray(item[key]) ? item[key][0] : item[key];
    grouped[groupKey] = (grouped[groupKey] || 0) + 1;
  });
  return grouped;
}

function generateMarkdownDocumentation(doc) {
  return `# API Contract Documentation

Generated on: ${new Date(doc.generated).toLocaleString()}

## API Overview

**Title:** ${doc.api.title}  
**Version:** ${doc.api.version}  
**Description:** ${doc.api.description}

## Endpoint Summary

- **Total Endpoints:** ${doc.endpoints.total}
- **Methods:** ${Object.entries(doc.endpoints.byMethod).map(([method, count]) => `${method} (${count})`).join(', ')}

### Endpoints by Method

${Object.entries(doc.endpoints.byMethod).map(([method, count]) => 
  `- **${method}:** ${count} endpoints`
).join('\n')}

### Endpoints by Tag

${Object.entries(doc.endpoints.byTag).map(([tag, count]) => 
  `- **${tag}:** ${count} endpoints`
).join('\n')}

## Schema Summary

- **Total Schemas:** ${doc.schemas.total}

### Available Schemas

${doc.schemas.details.map(schema => 
  `- **${schema.name}:** ${schema.type} with ${schema.properties.length} properties`
).join('\n')}

## Security Configuration

### Authentication Methods

${doc.security.schemes.map(scheme => 
  `- **${scheme.name}:** ${scheme.type} - ${scheme.description || 'No description'}`
).join('\n')}

## Recommendations

${doc.recommendations.map(rec => 
  `- **${rec.priority.toUpperCase()}:** ${rec.message}`
).join('\n')}

## Detailed Endpoints

${doc.endpoints.details.map(endpoint => `
### ${endpoint.method} ${endpoint.path}

**Operation ID:** ${endpoint.operationId || 'Not defined'}  
**Tags:** ${endpoint.tags.join(', ') || 'None'}  
**Deprecated:** ${endpoint.deprecated ? 'Yes' : 'No'}

${endpoint.summary ? `**Summary:** ${endpoint.summary}` : ''}

${endpoint.description ? `**Description:** ${endpoint.description}` : ''}

**Parameters:** ${endpoint.parameters.length > 0 ? 
  endpoint.parameters.map(p => `- ${p.name} (${p.in})${p.required ? ' *required*' : ''}`).join('\n') : 
  'None'
}

**Responses:** ${Object.keys(endpoint.responses).map(status => 
  `- ${status}: ${endpoint.responses[status].description || 'No description'}`
).join('\n')}
`).join('\n')}
`;
}

if (require.main === module) {
  generateContractDocs();
}

module.exports = { generateContractDocs };
