import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';

/**
 * Visual Regression Tests (Clean Version)
 * 
 * Tests API documentation and UI consistency without requiring
 * browser automation dependencies that have conflicts.
 * 
 * Features:
 * - API documentation structure validation
 * - Response format consistency checking
 * - Error page visual testing
 * - Documentation completeness verification
 * - Visual diff reporting
 */

describe('Visual Regression Tests (Clean)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  const logger = new Logger('VisualRegressionTestsClean');

  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'visual-screenshots');
  const BASELINE_DIR = path.join(process.cwd(), 'test-baseline', 'visual-screenshots');

  beforeAll(async () => {
    // Create necessary directories
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(BASELINE_DIR, { recursive: true });

    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [ConfigService],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await app.init();
    logger.log('Visual regression test environment initialized');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    logger.log('Visual regression test environment cleaned up');
  });

  describe('API Documentation Structure Tests', () => {
    it('should have accessible API documentation endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-docs')
        .expect(200);

      // Check basic response structure
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);

      // Save response content
      const html = response.text;
      const screenshotPath = path.join(SCREENSHOT_DIR, 'api-docs-accessible.html');
      fs.writeFileSync(screenshotPath, html);

      // Compare with baseline
      const baselinePath = path.join(BASELINE_DIR, 'api-docs-accessible.html');
      if (fs.existsSync(baselinePath)) {
        const baselineContent = fs.readFileSync(baselinePath, 'utf8');
        const isMatching = compareHTMLContent(html, baselineContent);
        expect(isMatching).toBe(true);
      } else {
        // Create baseline if it doesn't exist
        fs.writeFileSync(baselinePath, html);
        logger.warn(`Created baseline: ${baselinePath}`);
      }
    }, 30000);

    it('should have accessible JSON API specification', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-docs-json')
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);

      const spec = response.body;
      
      // Check OpenAPI structure
      expect(spec).toHaveProperty('openapi');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');

      // Save specification
      const specPath = path.join(SCREENSHOT_DIR, 'api-spec.json');
      fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));

      const baselinePath = path.join(BASELINE_DIR, 'api-spec.json');
      if (fs.existsSync(baselinePath)) {
        const baselineContent = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const isMatching = compareJSONStructure(spec, baselineContent);
        expect(isMatching).toBe(true);
      } else {
        fs.writeFileSync(baselinePath, JSON.stringify(spec, null, 2));
        logger.warn(`Created baseline: ${baselinePath}`);
      }
    }, 30000);
  });

  describe('API Response Consistency Tests', () => {
    it('should maintain consistent error response format', async () => {
      // Test 404 error
      const notFoundResponse = await request(app.getHttpServer())
        .get('/nonexistent-endpoint')
        .expect(404);

      const errorBody = notFoundResponse.body;
      
      // Check error response structure
      expect(errorBody).toHaveProperty('error');
      expect(errorBody).toHaveProperty('message');
      expect(errorBody).toHaveProperty('statusCode');
      expect(errorBody.statusCode).toBe(404);

      // Save error response
      const errorPath = path.join(SCREENSHOT_DIR, 'error-404-response.json');
      fs.writeFileSync(errorPath, JSON.stringify(errorBody, null, 2));

      const baselinePath = path.join(BASELINE_DIR, 'error-404-response.json');
      if (fs.existsSync(baselinePath)) {
        const baselineContent = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const isMatching = compareErrorStructure(errorBody, baselineContent);
        expect(isMatching).toBe(true);
      } else {
        fs.writeFileSync(baselinePath, JSON.stringify(errorBody, null, 2));
        logger.warn(`Created baseline: ${baselinePath}`);
      }
    }, 30000);

    it('should maintain consistent success response format', async () => {
      // Test successful response
      const successResponse = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      const successBody = successResponse.text;
      
      // Check response structure
      expect(typeof successBody).toBe('string');
      expect(successBody).toContain('Hello World!');

      // Save success response
      const successPath = path.join(SCREENSHOT_DIR, 'success-root-response.json');
      fs.writeFileSync(successPath, JSON.stringify({ 
        type: 'string',
        content: successBody,
        timestamp: new Date().toISOString()
      }, null, 2));

      const baselinePath = path.join(BASELINE_DIR, 'success-root-response.json');
      if (fs.existsSync(baselinePath)) {
        const baselineContent = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const isMatching = compareSuccessStructure({ type: 'string', content: successBody }, baselineContent);
        expect(isMatching).toBe(true);
      } else {
        fs.writeFileSync(baselinePath, JSON.stringify({ 
          type: 'string',
          content: successBody,
          timestamp: new Date().toISOString()
        }, null, 2));
        logger.warn(`Created baseline: ${baselinePath}`);
      }
    }, 30000);
  });

  describe('API Documentation Completeness', () => {
    it('should include all required API metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-docs-json')
        .expect(200);

      const spec = response.body;

      // Check required OpenAPI fields
      const requiredFields = ['openapi', 'info', 'paths', 'components'];
      const hasAllFields = requiredFields.every(field => 
        spec.hasOwnProperty(field)
      );

      expect(hasAllFields).toBe(true);

      // Check info object completeness
      const infoFields = ['title', 'version', 'description'];
      const hasAllInfoFields = infoFields.every(field => 
        spec.info && spec.info.hasOwnProperty(field)
      );

      expect(hasAllInfoFields).toBe(true);

      // Save completeness report
      const completenessPath = path.join(SCREENSHOT_DIR, 'api-completeness.json');
      fs.writeFileSync(completenessPath, JSON.stringify({
        requiredFields,
        hasAllFields,
        infoFields,
        hasAllInfoFields,
        timestamp: new Date().toISOString()
      }, null, 2));

      const baselinePath = path.join(BASELINE_DIR, 'api-completeness.json');
      if (fs.existsSync(baselinePath)) {
        const baselineContent = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const isMatching = compareCompleteness({
          requiredFields,
          hasAllFields,
          infoFields,
          hasAllInfoFields
        }, baselineContent);
        expect(isMatching).toBe(true);
      } else {
        fs.writeFileSync(baselinePath, JSON.stringify({
          requiredFields,
          hasAllFields,
          infoFields,
          hasAllInfoFields,
          timestamp: new Date().toISOString()
        }, null, 2));
        logger.warn(`Created baseline: ${baselinePath}`);
      }
    }, 30000);

    it('should have proper endpoint documentation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-docs-json')
        .expect(200);

      const spec = response.body;
      const paths = spec.paths || {};

      // Check for expected endpoints
      const expectedEndpoints = [
        '/auth/login',
        '/auth/profile',
        '/users',
        '/courses'
      ];

      const documentedEndpoints = Object.keys(paths);
      const hasExpectedEndpoints = expectedEndpoints.every(endpoint => 
        documentedEndpoints.includes(endpoint)
      );

      expect(hasExpectedEndpoints).toBe(true);

      // Save endpoint documentation report
      const endpointPath = path.join(SCREENSHOT_DIR, 'api-endpoints.json');
      fs.writeFileSync(endpointPath, JSON.stringify({
        expectedEndpoints,
        documentedEndpoints,
        hasExpectedEndpoints,
        totalDocumented: documentedEndpoints.length,
        timestamp: new Date().toISOString()
      }, null, 2));

      const baselinePath = path.join(BASELINE_DIR, 'api-endpoints.json');
      if (fs.existsSync(baselinePath)) {
        const baselineContent = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const isMatching = compareEndpointDocumentation({
          expectedEndpoints,
          documentedEndpoints,
          hasExpectedEndpoints,
          totalDocumented: documentedEndpoints.length
        }, baselineContent);
        expect(isMatching).toBe(true);
      } else {
        fs.writeFileSync(baselinePath, JSON.stringify({
          expectedEndpoints,
          documentedEndpoints,
          hasExpectedEndpoints,
          totalDocumented: documentedEndpoints.length,
          timestamp: new Date().toISOString()
        }, null, 2));
        logger.warn(`Created baseline: ${baselinePath}`);
      }
    }, 30000);
  });

  describe('Visual Consistency Analysis', () => {
    it('should analyze API documentation structure consistency', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-docs-json')
        .expect(200);

      const spec = response.body;

      // Analyze structure consistency
      const analysis = analyzeAPIConsistency(spec);

      expect(analysis.hasConsistentNaming).toBe(true);
      expect(analysis.hasConsistentResponses).toBe(true);
      expect(analysis.hasConsistentSecurity).toBe(true);

      // Save analysis report
      const analysisPath = path.join(SCREENSHOT_DIR, 'api-consistency-analysis.json');
      fs.writeFileSync(analysisPath, JSON.stringify({
        ...analysis,
        timestamp: new Date().toISOString()
      }, null, 2));

      const baselinePath = path.join(BASELINE_DIR, 'api-consistency-analysis.json');
      if (fs.existsSync(baselinePath)) {
        const baselineContent = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const isMatching = compareConsistencyAnalysis(analysis, baselineContent);
        expect(isMatching).toBe(true);
      } else {
        fs.writeFileSync(baselinePath, JSON.stringify({
          ...analysis,
          timestamp: new Date().toISOString()
        }, null, 2));
        logger.warn(`Created baseline: ${baselinePath}`);
      }
    }, 30000);
  });
});

/**
 * Compare HTML content for visual regression
 */
function compareHTMLContent(current: string, baseline: string): boolean {
  const normalizeHTML = (html: string) => 
    html.replace(/\s+/g, ' ')
         .replace(/>\s+</g, '><')
         .toLowerCase()
         .trim();

  const normalizedCurrent = normalizeHTML(current);
  const normalizedBaseline = normalizeHTML(baseline);

  return normalizedCurrent === normalizedBaseline;
}

/**
 * Compare JSON structure for visual regression
 */
function compareJSONStructure(current: any, baseline: any): boolean {
  try {
    const currentKeys = JSON.stringify(current).split('').sort().join('');
    const baselineKeys = JSON.stringify(baseline).split('').sort().join('');
    
    return currentKeys === baselineKeys;
  } catch (error) {
    return false;
  }
}

/**
 * Compare error response structure
 */
function compareErrorStructure(current: any, baseline: any): boolean {
  const requiredFields = ['error', 'message', 'statusCode'];
  
  return requiredFields.every(field => 
    current.hasOwnProperty(field) && baseline.hasOwnProperty(field)
  );
}

/**
 * Compare success response structure
 */
function compareSuccessStructure(current: any, baseline: any): boolean {
  return current.type === baseline.type && 
         current.content === baseline.content;
}

/**
 * Compare completeness data
 */
function compareCompleteness(current: any, baseline: any): boolean {
  return current.hasAllFields === baseline.hasAllFields &&
         current.hasAllInfoFields === baseline.hasAllInfoFields;
}

/**
 * Compare endpoint documentation
 */
function compareEndpointDocumentation(current: any, baseline: any): boolean {
  return current.hasExpectedEndpoints === baseline.hasExpectedEndpoints &&
         current.totalDocumented === baseline.totalDocumented;
}

/**
 * Compare consistency analysis
 */
function compareConsistencyAnalysis(current: any, baseline: any): boolean {
  return current.hasConsistentNaming === baseline.hasConsistentNaming &&
         current.hasConsistentResponses === baseline.hasConsistentResponses &&
         current.hasConsistentSecurity === baseline.hasConsistentSecurity;
}

/**
 * Analyze API consistency
 */
function analyzeAPIConsistency(spec: any): any {
  const paths = spec.paths || {};
  const schemas = spec.components?.schemas || {};

  // Check naming consistency
  const pathNames = Object.keys(paths);
  const hasConsistentNaming = pathNames.every((name: string) => 
    /^[a-z0-9\/{}-]+$/.test(name)
  );

  // Check response consistency
  const responses = Object.values(paths).flatMap((path: any) => Object.values(path));
  const hasConsistentResponses = responses.every((response: any) => {
    if (typeof response === 'object' && response.responses) {
      const responseCodes = Object.keys(response.responses);
      return responseCodes.some((code: string) => ['200', '201', '400', '401', '404'].includes(code));
    }
    return true;
  });

  // Check security consistency
  const hasConsistentSecurity = spec.components?.securitySchemes || 
                               Object.keys(spec.components?.securitySchemes || {}).length > 0;

  return {
    hasConsistentNaming,
    hasConsistentResponses,
    hasConsistentSecurity,
    totalPaths: pathNames.length,
    totalSchemas: Object.keys(schemas).length
  };
}
