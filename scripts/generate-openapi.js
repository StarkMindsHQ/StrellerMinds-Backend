#!/usr/bin/env node

/**
 * OpenAPI Documentation Generator
 * 
 * This script generates a static OpenAPI JSON file from the NestJS Swagger configuration.
 * It must be run after any route or DTO changes to keep the documentation in sync.
 * 
 * Usage: npm run docs:generate
 */

const fs = require('fs');
const path = require('path');

// Note: This is a placeholder script. In a real implementation, this would:
// 1. Load the NestJS application
// 2. Extract the Swagger document
// 3. Write it to docs/openapi.json
//
// For now, we'll create a basic OpenAPI structure that matches our configuration

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'StrellerMinds Backend API',
    description:
      'Comprehensive API for StrellerMinds - a blockchain education platform built on the Stellar network. ' +
      'Provides secure user management, course delivery, and seamless Stellar blockchain integration for on-chain learning verification and credentialing.',
    version: '0.0.1',
    contact: {
      name: 'StarkMindsHQ',
      url: 'https://github.com/StarkMindsHQ/StrellerMinds-Backend',
      email: 'contact@strellerminds.com',
    },
    license: {
      name: 'UNLICENSED',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.strellerminds.com',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check and system status endpoints',
    },
    {
      name: 'Authentication',
      description: 'User authentication, registration, and token management',
    },
    {
      name: 'MFA',
      description: 'Multi-factor authentication setup and verification',
    },
    {
      name: 'Users',
      description: 'User management and profile operations',
    },
    {
      name: 'Courses',
      description: 'Course management and enrollment',
    },
    {
      name: 'Database',
      description: 'Database connection pool monitoring and metrics',
    },
    {
      name: 'GDPR',
      description: 'GDPR compliance - data export and deletion',
    },
    {
      name: 'Contract Testing',
      description: 'Contract testing and OpenAPI validation',
    },
  ],
  paths: {
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Simple health check endpoint to verify API is running.',
        operationId: 'getHello',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: 'Hello World!',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token for authentication. Tokens are typically sent via secure httpOnly cookies but can also be passed in the Authorization header.',
      },
    },
  },
};

// Ensure docs directory exists
const docsDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Write OpenAPI JSON file
const outputPath = path.join(docsDir, 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log(`✅ OpenAPI documentation generated: ${outputPath}`);
console.log(`📖 View documentation at: http://localhost:3000/api/docs`);
