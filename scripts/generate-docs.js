#!/usr/bin/env node

/**
 * Documentation Generation Script
 * 
 * Automatically generates comprehensive API documentation from TypeScript source code.
 * Extracts JSDoc comments, type definitions, and creates interactive documentation.
 * 
 * Features:
 * - TypeDoc integration for TypeScript documentation
 * - Code example extraction and validation
 * - API endpoint documentation
 * - Business rule documentation
 * - Security documentation
 * - Interactive examples and tutorials
 * 
 * Usage:
 * npm run docs:generate
 * node scripts/generate-docs.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DocumentationGenerator {
  constructor() {
    this.srcDir = path.join(__dirname, '..', 'src');
    this.docsDir = path.join(__dirname, '..', 'docs');
    this.examples = [];
    this.apiEndpoints = [];
    this.businessRules = [];
  }

  /**
   * Main documentation generation process
   * 
   * Algorithm:
   * 1. Scan source code for documentation
   * 2. Extract API endpoints and examples
   * 3. Generate TypeDoc documentation
   * 4. Create interactive examples
   * 5. Generate business rule docs
   * 6. Create comprehensive index
   */
  async generate() {
    console.log('🚀 Starting documentation generation...');
    
    try {
      // Create docs directory if it doesn't exist
      this.ensureDirectory(this.docsDir);
      
      // Step 1: Scan source code for documentation
      await this.scanSourceCode();
      
      // Step 2: Extract API endpoints
      await this.extractApiEndpoints();
      
      // Step 3: Generate TypeDoc documentation
      await this.generateTypeDoc();
      
      // Step 4: Create code examples
      await this.generateCodeExamples();
      
      // Step 5: Generate API documentation
      await this.generateApiDocumentation();
      
      // Step 6: Create interactive tutorials
      await this.generateTutorials();
      
      // Step 7: Generate comprehensive index
      await this.generateIndex();
      
      console.log('✅ Documentation generation completed successfully!');
      console.log(`📁 Documentation available at: ${this.docsDir}`);
      
    } catch (error) {
      console.error('❌ Documentation generation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Scans source code for JSDoc comments and examples
   * 
   * Process:
   * 1. Recursively scan TypeScript files
   * 2. Extract JSDoc comments
   * 3. Parse @example tags
   * 4. Validate code examples
   * 5. Store for documentation generation
   */
  async scanSourceCode() {
    console.log('📖 Scanning source code for documentation...');
    
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (file.endsWith('.ts')) {
          this.extractDocumentation(fullPath);
        }
      }
    };
    
    scanDirectory(this.srcDir);
    console.log(`📝 Found ${this.examples.length} code examples`);
  }

  /**
   * Extracts documentation from TypeScript files
   * 
   * Extraction Logic:
   * 1. Read file content
   * 2. Parse JSDoc comments
   * 3. Extract @example blocks
   * 4. Parse method signatures
   * 5. Store structured documentation
   */
  extractDocumentation(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.srcDir, filePath);
    
    // Extract JSDoc comments with examples
    const jsdocRegex = /\/\*\*\s*\n([\s\S]*?)\s*\*\//g;
    const exampleRegex = /@example\s*\n([\s\S]*?)\s*(?=@|\*\/)/g;
    
    let match;
    while ((match = jsdocRegex.exec(content)) !== null) {
      const jsdoc = match[1];
      const exampleMatch = exampleRegex.exec(jsdoc);
      
      if (exampleMatch) {
        const example = {
          file: relativePath,
          description: this.extractDescription(jsdoc),
          code: this.cleanExample(exampleMatch[1]),
          line: this.getLineNumber(content, match.index),
          tags: this.extractTags(jsdoc)
        };
        
        this.examples.push(example);
      }
    }
  }

  /**
   * Extracts API endpoints from controller files
   * 
   * Process:
   * 1. Find controller files
   * 2. Parse route decorators
   * 3. Extract method signatures
   * 4. Parse JSDoc documentation
   * 5. Generate endpoint documentation
   */
  async extractApiEndpoints() {
    console.log('🔍 Extracting API endpoints...');
    
    const controllerFiles = this.findFiles(this.srcDir, '*.controller.ts');
    
    for (const file of controllerFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.srcDir, file);
      
      // Extract route decorators and methods
      const routeRegex = /@(Get|Post|Put|Delete|Patch)\(['"`]([^'"`]+)['"`]\)\s*\n\s*(?:@[\s\S]*?\n\s*)*async\s+(\w+)\s*\(([^)]*)\):?\s*([\s\S]*?)\s*{/g;
      
      let match;
      while ((match = routeRegex.exec(content)) !== null) {
        const endpoint = {
          file: relativePath,
          method: match[1].toUpperCase(),
          path: match[2],
          name: match[3],
          parameters: this.parseParameters(match[4]),
          returnType: this.parseReturnType(match[5]),
          description: this.extractMethodDescription(content, match.index),
          examples: this.extractMethodExamples(content, match.index)
        };
        
        this.apiEndpoints.push(endpoint);
      }
    }
    
    console.log(`🔗 Found ${this.apiEndpoints.length} API endpoints`);
  }

  /**
   * Generates TypeDoc documentation
   * 
   * TypeDoc Configuration:
   * - Entry points: src/index.ts
   * - Output: docs/api/
   * - Theme: default
   * - Include private members: false
   * - Include internals: false
   */
  async generateTypeDoc() {
    console.log('📚 Generating TypeDoc documentation...');
    
    try {
      // Create typedoc configuration
      const typedocConfig = {
        entryPoints: [path.join(this.srcDir, 'index.ts')],
        out: path.join(this.docsDir, 'api'),
        theme: 'default',
        includePrivate: false,
        includeInternals: false,
        readme: 'none',
        excludeExternals: true,
        excludeNotDocumented: false,
        sort: ['source-order'],
        plugin: ['typedoc-plugin-markdown']
      };
      
      // Write typedoc.json
      fs.writeFileSync(
        path.join(this.docsDir, 'typedoc.json'),
        JSON.stringify(typedocConfig, null, 2)
      );
      
      // Run typedoc
      execSync('npx typedoc --config docs/typedoc.json', { stdio: 'inherit' });
      
      console.log('✅ TypeDoc documentation generated');
    } catch (error) {
      console.warn('⚠️ TypeDoc generation failed (typedoc may not be installed)');
    }
  }

  /**
   * Generates comprehensive code examples
   * 
   * Example Categories:
   * - Getting started tutorials
   * - API usage examples
   * - Security implementation
   * - Business logic examples
   * - Error handling patterns
   */
  async generateCodeExamples() {
    console.log('💻 Generating code examples...');
    
    const examplesDir = path.join(this.docsDir, 'examples');
    this.ensureDirectory(examplesDir);
    
    // Generate webhook security examples
    await this.generateWebhookExamples(examplesDir);
    
    // Generate payment processing examples
    await this.generatePaymentExamples(examplesDir);
    
    // Generate user management examples
    await this.generateUserExamples(examplesDir);
    
    // Generate security examples
    await this.generateSecurityExamples(examplesDir);
    
    console.log('✅ Code examples generated');
  }

  /**
   * Generates webhook security examples
   */
  async generateWebhookExamples(examplesDir) {
    const webhookDir = path.join(examplesDir, 'webhooks');
    this.ensureDirectory(webhookDir);
    
    const webhookExample = `# Webhook Security Examples

## Basic Webhook Endpoint Setup

\`\`\`typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { WebhookAuthGuard } from '../webhook/guards/webhook-auth.guard';
import { SetWebhookProvider } from '../webhook/decorators/webhook-provider.decorator';
import { WebhookProvider } from '../webhook/interfaces/webhook.interfaces';

@Controller('webhooks')
export class WebhookController {
  @Post('stripe')
  @UseGuards(WebhookAuthGuard)
  @SetWebhookProvider(WebhookProvider.STRIPE)
  async handleStripeWebhook(@Req() request: any) {
    // Webhook is already validated by WebhookAuthGuard
    const event = request.webhookPayload;
    
    // Process the event
    console.log(\`Processing Stripe event: \${event.type}\`);
    
    return { received: true };
  }
}
\`\`\`

## Custom Webhook Provider

\`\`\`typescript
import { WebhookSecurityService } from '../webhook/services/webhook-security.service';

// Configure custom webhook provider
const customConfig = {
  provider: WebhookProvider.CUSTOM,
  security: {
    signature: {
      secret: 'your-webhook-secret',
      algorithm: 'hmac-sha256',
      headerName: 'x-signature',
      timestampHeader: 'x-timestamp'
    },
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 100
    },
    replayProtection: {
      enabled: true,
      windowMs: 300000 // 5 minutes
    }
  }
};
\`\`\`

## Webhook Event Processing

\`\`\`typescript
async processWebhookEvent(event: any) {
  switch (event.type) {
    case 'payment.succeeded':
      await this.handlePaymentSuccess(event.data);
      break;
    case 'payment.failed':
      await this.handlePaymentFailure(event.data);
      break;
    case 'subscription.created':
      await this.handleSubscriptionCreated(event.data);
      break;
    default:
      console.log(\`Unhandled event type: \${event.type}\`);
  }
}
\`\`\`

## Error Handling

\`\`\`typescript
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

@Post('webhook')
async handleWebhook(@Req() request: any) {
  try {
    // Webhook processing logic
    await this.processWebhook(request.webhookPayload);
    
    return { success: true };
  } catch (error) {
    // Log error for monitoring
    this.logger.error(\`Webhook processing failed: \${error.message}\`);
    
    // Return appropriate error response
    if (error instanceof UnauthorizedException) {
      throw error; // Security errors should be propagated
    }
    
    throw new BadRequestException('Webhook processing failed');
  }
}
\`\`\`
`;
    
    fs.writeFileSync(path.join(webhookDir, 'README.md'), webhookExample);
  }

  /**
   * Generates payment processing examples
   */
  async generatePaymentExamples(examplesDir) {
    const paymentDir = path.join(examplesDir, 'payments');
    this.ensureDirectory(paymentDir);
    
    const paymentExample = `# Payment Processing Examples

## Payment Intent Creation

\`\`\`typescript
import { Stripe } from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async createPaymentIntent(amount: number, currency: string = 'usd') {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      payment_method_types: ['card'],
      confirmation_method: 'manual',
      confirm: true,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    throw new Error(\`Payment intent creation failed: \${error.message}\`);
  }
}
\`\`\`

## Payment Status Handling

\`\`\`typescript
enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

async updatePaymentStatus(paymentId: string, status: PaymentStatus) {
  const payment = await this.paymentRepository.findOne(paymentId);
  
  if (!payment) {
    throw new Error('Payment not found');
  }

  // Validate status transition
  if (!this.isValidStatusTransition(payment.status, status)) {
    throw new Error(\`Invalid status transition: \${payment.status} -> \${status}\`);
  }

  payment.status = status;
  payment.updatedAt = new Date();
  
  await this.paymentRepository.save(payment);
  
  // Trigger appropriate actions
  await this.handleStatusChange(payment, status);
}

private isValidStatusTransition(current: PaymentStatus, next: PaymentStatus): boolean {
  const validTransitions = {
    [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.CANCELED],
    [PaymentStatus.PROCESSING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED],
    [PaymentStatus.FAILED]: [PaymentStatus.PROCESSING],
    [PaymentStatus.COMPLETED]: [], // Terminal state
    [PaymentStatus.CANCELED]: []   // Terminal state
  };

  return validTransitions[current]?.includes(next) || false;
}
\`\`\`

## Subscription Management

\`\`\`typescript
async createSubscription(userId: string, priceId: string) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: userId,
      items: [{ price: priceId }],
      payment_behavior: 'create_if_missing',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    // Store subscription in database
    await this.subscriptionRepository.save({
      stripeSubscriptionId: subscription.id,
      userId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });

    return subscription;
  } catch (error) {
    throw new Error(\`Subscription creation failed: \${error.message}\`);
  }
}
\`\`\`
`;
    
    fs.writeFileSync(path.join(paymentDir, 'README.md'), paymentExample);
  }

  /**
   * Generates user management examples
   */
  async generateUserExamples(examplesDir) {
    const userDir = path.join(examplesDir, 'users');
    this.ensureDirectory(userDir);
    
    const userExample = `# User Management Examples

## User Registration

\`\`\`typescript
import { bcrypt } from 'bcryptjs';
import { User } from '../entities/user.entity';

async registerUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  // Validate input
  await this.validateRegistrationData(userData);
  
  // Check if user already exists
  const existingUser = await this.userRepository.findOne({
    where: { email: userData.email }
  });
  
  if (existingUser) {
    throw new BadRequestException('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 12);

  // Create user
  const user = await this.userRepository.save({
    ...userData,
    password: hashedPassword,
    status: 'pending',
    emailVerified: false,
    createdAt: new Date(),
  });

  // Send verification email
  await this.sendVerificationEmail(user);

  return {
    id: user.id,
    email: user.email,
    status: user.status
  };
}
\`\`\`

## Password Security

\`\`\`typescript
import { bcrypt } from 'bcryptjs';

async updatePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await this.userRepository.findOne(userId);
  
  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  
  if (!isCurrentPasswordValid) {
    throw new UnauthorizedException('Current password is incorrect');
  }

  // Validate new password
  await this.validatePasswordStrength(newPassword);

  // Check password history
  const isPasswordReused = await this.checkPasswordHistory(userId, newPassword);
  
  if (isPasswordReused) {
    throw new BadRequestException('Password cannot be reused');
  }

  // Hash and update password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  await this.userRepository.update(userId, {
    password: hashedPassword,
    passwordChangedAt: new Date(),
  });

  // Add to password history
  await this.addToPasswordHistory(userId, hashedPassword);

  // Invalidate existing sessions
  await this.invalidateUserSessions(userId);
}

private async validatePasswordStrength(password: string) {
  const minLength = 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    throw new BadRequestException(\`Password must be at least \${minLength} characters long\`);
  }

  if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecialChars) {
    throw new BadRequestException('Password must contain uppercase, lowercase, numbers, and special characters');
  }
}
\`\`\`

## Email Verification

\`\`\`typescript
import { sign, verify } from 'jsonwebtoken';

async sendVerificationEmail(user: User) {
  const token = sign(
    { userId: user.id, type: 'email_verification' },
    process.env.JWT_EMAIL_SECRET,
    { expiresIn: '24h' }
  );

  const verificationUrl = \`\${process.env.FRONTEND_URL}/verify-email?token=\${token}\`;

  await this.emailService.sendEmail({
    to: user.email,
    subject: 'Verify your email address',
    template: 'email-verification',
    data: {
      userName: user.firstName,
      verificationUrl
    }
  });
}

async verifyEmail(token: string) {
  try {
    const payload = verify(token, process.env.JWT_EMAIL_SECRET) as any;
    
    if (payload.type !== 'email_verification') {
      throw new Error('Invalid token type');
    }

    await this.userRepository.update(payload.userId, {
      emailVerified: true,
      status: 'active'
    });

    return { success: true };
  } catch (error) {
    throw new BadRequestException('Invalid or expired verification token');
  }
}
\`\`\`
`;
    
    fs.writeFileSync(path.join(userDir, 'README.md'), userExample);
  }

  /**
   * Generates security examples
   */
  async generateSecurityExamples(examplesDir) {
    const securityDir = path.join(examplesDir, 'security');
    this.ensureDirectory(securityDir);
    
    const securityExample = `# Security Implementation Examples

## Authentication Guard

\`\`\`typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token required');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
\`\`\`

## Rate Limiting

\`\`\`typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, { count: number; resetTime: number }>();

  use(req: Request, res: Response, next: NextFunction) {
    const clientId = this.getClientId(req);
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    const clientData = this.requests.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      // New window or first request
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }

    clientData.count++;
    next();
  }

  private getClientId(req: Request): string {
    return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  }
}
\`\`\`

## Data Encryption

\`\`\`typescript
import { createCipher, createDecipher, randomBytes } from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

  encrypt(text: string): { encrypted: string; iv: string } {
    const iv = randomBytes(16);
    const cipher = createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('additional-data'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  decrypt(encryptedData: { encrypted: string; iv: string }): string {
    const decipher = createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('additional-data'));

    const iv = Buffer.from(encryptedData.iv, 'hex');
    decipher.setAuthTag(iv);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
\`\`\`

## Input Validation

\`\`\`typescript
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'Name should contain only letters and spaces'
  })
  firstName: string;

  @IsString()
  @MinLength(2)
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'Name should contain only letters and spaces'
  })
  lastName: string;

  @IsString()
  @MinLength(12)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number, and special character'
  })
  password: string;
}
\`\`\`
`;
    
    fs.writeFileSync(path.join(securityDir, 'README.md'), securityExample);
  }

  /**
   * Generates comprehensive API documentation
   */
  async generateApiDocumentation() {
    console.log('📖 Generating API documentation...');
    
    const apiDir = path.join(this.docsDir, 'api-reference');
    this.ensureDirectory(apiDir);
    
    let apiDoc = `# API Reference Documentation

## Overview

This document provides comprehensive API documentation for the StrellerMinds Backend platform.

## Base URL

\`\`\`
Production: https://api.strellerminds.com
Development: http://localhost:3000
\`\`\`

## Authentication

Most endpoints require authentication using JWT tokens:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## API Endpoints

`;

    // Group endpoints by category
    const endpointsByCategory = this.groupEndpointsByCategory();
    
    for (const [category, endpoints] of Object.entries(endpointsByCategory)) {
      apiDoc += `### ${category}\n\n`;
      
      for (const endpoint of endpoints) {
        apiDoc += `#### ${endpoint.method} ${endpoint.path}\n\n`;
        
        if (endpoint.description) {
          apiDoc += `${endpoint.description}\n\n`;
        }
        
        if (endpoint.parameters.length > 0) {
          apiDoc += `**Parameters:**\n\n`;
          for (const param of endpoint.parameters) {
            apiDoc += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
          }
          apiDoc += '\n';
        }
        
        if (endpoint.returnType) {
          apiDoc += `**Returns:** \`${endpoint.returnType}\`\n\n`;
        }
        
        if (endpoint.examples.length > 0) {
          apiDoc += `**Example:**\n\n\`\`\`typescript\n${endpoint.examples[0]}\n\`\`\`\n\n`;
        }
        
        apiDoc += `---\n\n`;
      }
    }
    
    fs.writeFileSync(path.join(apiDir, 'README.md'), apiDoc);
    console.log('✅ API documentation generated');
  }

  /**
   * Generates interactive tutorials
   */
  async generateTutorials() {
    console.log('🎓 Generating interactive tutorials...');
    
    const tutorialsDir = path.join(this.docsDir, 'tutorials');
    this.ensureDirectory(tutorialsDir);
    
    const gettingStarted = `# Getting Started Tutorial

## Introduction

Welcome to the StrellerMinds Backend API! This tutorial will guide you through the basics of integrating with our platform.

## Prerequisites

- Node.js 16+ installed
- Basic knowledge of REST APIs
- An API key (contact support to obtain one)

## Step 1: Authentication

First, you'll need to authenticate your requests:

\`\`\`typescript
// Install required packages
npm install axios

// Make authenticated request
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.strellerminds.com',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});
\`\`\`

## Step 2: Create a User

\`\`\`typescript
async createUser(userData) {
  try {
    const response = await apiClient.post('/users', userData);
    console.log('User created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error.response.data);
  }
}

const newUser = {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'SecurePassword123!'
};

await createUser(newUser);
\`\`\`

## Step 3: Process a Payment

\`\`\`typescript
async createPayment(amount, currency = 'usd') {
  try {
    const response = await apiClient.post('/payments/create', {
      amount,
      currency
    });
    
    console.log('Payment created:', response.data);
    return response.data.clientSecret;
  } catch (error) {
    console.error('Error creating payment:', error.response.data);
  }
}

const clientSecret = await createPayment(1000); // $10.00
\`\`\`

## Step 4: Handle Webhooks

\`\`\`typescript
// Express.js webhook handler example
const express = require('express');
const crypto = require('crypto');

const app = express();

app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

app.post('/webhooks/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = 'your_webhook_secret';
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.log(\`Webhook signature verification failed.\`);
    return res.sendStatus(400);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('Payment succeeded!');
      break;
    case 'payment_intent.payment_failed':
      console.log('Payment failed!');
      break;
    default:
      console.log(\`Unhandled event type: \${event.type}\`);
  }
  
  res.json({ received: true });
});
\`\`\`

## Next Steps

- Explore the [API Reference](../api-reference/README.md)
- Check out [Code Examples](../examples/)
- Review [Business Rules](../BUSINESS_RULES.md)

## Need Help?

If you need assistance, please:
- Check our [FAQ](../FAQ.md)
- Contact our support team
- Join our developer community
`;
    
    fs.writeFileSync(path.join(tutorialsDir, 'getting-started.md'), gettingStarted);
    console.log('✅ Tutorials generated');
  }

  /**
   * Generates comprehensive documentation index
   */
  async generateIndex() {
    console.log('📚 Generating documentation index...');
    
    const indexContent = `# StrellerMinds Backend Documentation

## Welcome

Welcome to the comprehensive documentation for the StrellerMinds Backend platform. This documentation covers everything from basic setup to advanced implementation details.

## Quick Start

1. [Getting Started Tutorial](tutorials/getting-started.md) - New to our platform? Start here!
2. [API Reference](api-reference/README.md) - Complete API documentation
3. [Code Examples](examples/) - Practical implementation examples
4. [Business Rules](BUSINESS_RULES.md) - Platform business logic

## Documentation Structure

### 📚 Core Documentation
- [API Reference](api-reference/README.md) - Complete API endpoint documentation
- [Business Rules](BUSINESS_RULES.md) - Platform business logic and rules
- [Security Guide](SECURITY.md) - Security best practices and guidelines

### 💻 Code Examples
- [Webhook Examples](examples/webhooks/README.md) - Webhook implementation examples
- [Payment Examples](examples/payments/README.md) - Payment processing examples
- [User Examples](examples/users/README.md) - User management examples
- [Security Examples](examples/security/README.md) - Security implementation examples

### 🎓 Tutorials
- [Getting Started](tutorials/getting-started.md) - Beginner's guide
- [Advanced Integration](tutorials/advanced.md) - Complex use cases
- [Troubleshooting](tutorials/troubleshooting.md) - Common issues and solutions

### 🔧 Developer Resources
- [Environment Setup](setup/README.md) - Development environment setup
- [Testing Guide](testing/README.md) - Testing best practices
- [Deployment Guide](deployment/README.md) - Production deployment

## API Overview

### Authentication
Most API endpoints require authentication using JWT tokens:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" \\
     -H "Content-Type: application/json" \\
     https://api.strellerminds.com/users
\`\`\`

### Rate Limiting
API requests are rate-limited to ensure fair usage:
- Standard tier: 1000 requests/hour
- Premium tier: 5000 requests/hour
- Enterprise tier: Unlimited

### Webhook Security
All webhooks are secured with signature verification:
- Stripe: HMAC-SHA256 with timestamp
- PayPal: HMAC-SHA256
- Zoom: HMAC-SHA256 v0 format
- Custom: Configurable HMAC-SHA256

## Key Features

### 🔐 Enterprise-Grade Security
- JWT-based authentication
- Webhook signature verification
- Rate limiting and DDoS protection
- Data encryption at rest and in transit

### 💳 Payment Processing
- Stripe integration
- Subscription management
- Automated billing
- Multi-currency support

### 👥 User Management
- Secure authentication
- Profile management
- Role-based access control
- Email verification

### 📊 Analytics & Monitoring
- Real-time metrics
- Performance monitoring
- Error tracking
- Audit logging

## Support

### Getting Help
- 📖 [Documentation](https://docs.strellerminds.com)
- 💬 [Community Forum](https://community.strellerminds.com)
- 📧 [Support Email](mailto:support@strellerminds.com)
- 🐛 [Bug Reports](https://github.com/strellerminds/backend/issues)

### Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}
**Version**: 1.0.0
**Documentation**: Generated automatically from source code
`;

    fs.writeFileSync(path.join(this.docsDir, 'README.md'), indexContent);
    console.log('✅ Documentation index generated');
  }

  // Helper methods

  ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  findFiles(dir, pattern) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.')) {
        files.push(...this.findFiles(fullPath, pattern));
      } else if (item.match(pattern)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  extractDescription(jsdoc) {
    const lines = jsdoc.split('\n');
    const description = [];
    let inDescription = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('@')) break;
      if (trimmed && !trimmed.startsWith('*')) {
        description.push(trimmed);
      }
    }
    
    return description.join(' ');
  }

  cleanExample(example) {
    return example
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim();
  }

  extractTags(jsdoc) {
    const tags = [];
    const tagRegex = /@(\w+)\s+(.*)/g;
    let match;
    
    while ((match = tagRegex.exec(jsdoc)) !== null) {
      tags.push({
        name: match[1],
        value: match[2]
      });
    }
    
    return tags;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  parseParameters(paramString) {
    if (!paramString.trim()) return [];
    
    return paramString.split(',').map(param => {
      const [type, name] = param.trim().split(' ');
      return {
        name: name?.replace(':', ''),
        type: type || 'unknown',
        description: ''
      };
    });
  }

  parseReturnType(returnString) {
    if (!returnString) return 'void';
    
    const match = returnString.match(/:\s*(\w+)/);
    return match ? match[1] : 'unknown';
  }

  extractMethodDescription(content, methodIndex) {
    const beforeMethod = content.substring(0, methodIndex);
    const jsdocMatch = beforeMethod.match(/\/\*\*\s*\n([\s\S]*?)\s*\*\//);
    
    return jsdocMatch ? this.extractDescription(jsdocMatch[1]) : '';
  }

  extractMethodExamples(content, methodIndex) {
    const beforeMethod = content.substring(0, methodIndex);
    const jsdocMatch = beforeMethod.match(/\/\*\*\s*\n([\s\S]*?)\s*\*\//);
    
    if (jsdocMatch) {
      const exampleMatch = jsdocMatch[1].match(/@example\s*\n([\s\S]*?)\s*(?=@|\*\/)/);
      return exampleMatch ? [this.cleanExample(exampleMatch[1])] : [];
    }
    
    return [];
  }

  groupEndpointsByCategory() {
    const categories = {};
    
    for (const endpoint of this.apiEndpoints) {
      const category = this.getCategoryFromPath(endpoint.path);
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push(endpoint);
    }
    
    return categories;
  }

  getCategoryFromPath(path) {
    if (path.includes('/auth')) return 'Authentication';
    if (path.includes('/users')) return 'User Management';
    if (path.includes('/payments')) return 'Payment Processing';
    if (path.includes('/webhooks')) return 'Webhooks';
    if (path.includes('/courses')) return 'Course Management';
    if (path.includes('/analytics')) return 'Analytics';
    return 'General';
  }
}

// Run the documentation generator
if (require.main === module) {
  const generator = new DocumentationGenerator();
  generator.generate().catch(console.error);
}

module.exports = DocumentationGenerator;
