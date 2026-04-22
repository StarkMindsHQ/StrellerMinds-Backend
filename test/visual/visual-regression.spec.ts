// import { Test, TestingModule } from '@nestjs/testing';
// import { ConfigService } from '@nestjs/config';
// import { INestApplication } from '@nestjs/common';
// import * as request from 'supertest';
// import * as fs from 'fs';
// import * as path from 'path';
// import { Logger } from '@nestjs/common';

// /**
//  * Visual Regression Tests (Simplified)
//  * 
//  * Tests API documentation and UI consistency without requiring
//  * browser automation dependencies that have conflicts.
//  * 
//  * Features:
//  * - API documentation structure validation
//  * - Response format consistency checking
//  * - Error page visual testing
//  * - Documentation completeness verification
//  * - Visual diff reporting
//  */

// describe('Visual Regression Tests', () => {
//   let app: INestApplication;
//   let page: puppeteer.Page;
//   let configService: ConfigService;
//   const logger = new Logger('VisualRegressionTests');

//   const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
//   const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'visual-screenshots');
//   const BASELINE_DIR = path.join(process.cwd(), 'test-baseline', 'visual-screenshots');

//   beforeAll(async () => {
//     // Create necessary directories
//     fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
//     fs.mkdirSync(BASELINE_DIR, { recursive: true });

//     // Launch browser
//     browser = await puppeteer.launch({
//       headless: process.env.CI === 'true' ? 'new' : false,
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--window-size=1920,1080'
//       ]
//     });

//     page = await browser.newPage();
//     await page.setViewport({ width: 1920, height: 1080 });

//     // Set user agent
//     await page.setUserAgent('Visual-Regression-Test/1.0');

//     logger.log('Visual regression test environment initialized');
//   });

//   afterAll(async () => {
//     if (browser) {
//       await browser.close();
//     }
//     logger.log('Visual regression test environment cleaned up');
//   });

//   describe('API Documentation Visual Tests', () => {
//     it('should render API documentation homepage correctly', async () => {
//       await page.goto(`${BASE_URL}/api-docs`, { waitUntil: 'networkidle2' });
      
//       // Wait for main content to load
//       await page.waitForSelector('.swagger-ui', { timeout: 10000 });
      
//       const screenshot = await page.screenshot({
//         fullPage: true,
//         type: 'png'
//       });

//       const screenshotPath = path.join(SCREENSHOT_DIR, 'api-docs-homepage.png');
//       fs.writeFileSync(screenshotPath, screenshot);

//       // Compare with baseline
//       const baselinePath = path.join(BASELINE_DIR, 'api-docs-homepage.png');
//       if (fs.existsSync(baselinePath)) {
//         const isMatching = await compareScreenshots(screenshotPath, baselinePath);
//         expect(isMatching).toBe(true);
//       } else {
//         // Create baseline if it doesn't exist
//         fs.writeFileSync(baselinePath, screenshot);
//         logger.warn(`Created baseline: ${baselinePath}`);
//       }
//     }, 30000);

//     it('should render authentication endpoints documentation', async () => {
//       await page.goto(`${BASE_URL}/api-docs`, { waitUntil: 'networkidle2' });
      
//       // Wait for Swagger UI to load
//       await page.waitForSelector('.swagger-ui', { timeout: 10000 });
      
//       // Click on Authentication section
//       await page.click('[data-tag="Authentication"]');
//       await page.waitForTimeout(1000);
      
//       // Expand POST /auth/login endpoint
//       await page.click('.opblock.opblock.post');
//       await page.waitForTimeout(1000);
      
//       const screenshot = await page.screenshot({
//         fullPage: true,
//         type: 'png'
//       });

//       const screenshotPath = path.join(SCREENSHOT_DIR, 'api-docs-auth-endpoints.png');
//       fs.writeFileSync(screenshotPath, screenshot);

//       const baselinePath = path.join(BASELINE_DIR, 'api-docs-auth-endpoints.png');
//       if (fs.existsSync(baselinePath)) {
//         const isMatching = await compareScreenshots(screenshotPath, baselinePath);
//         expect(isMatching).toBe(true);
//       } else {
//         fs.writeFileSync(baselinePath, screenshot);
//         logger.warn(`Created baseline: ${baselinePath}`);
//       }
//     }, 30000);

//     it('should render user endpoints documentation', async () => {
//       await page.goto(`${BASE_URL}/api-docs`, { waitUntil: 'networkidle2' });
      
//       await page.waitForSelector('.swagger-ui', { timeout: 10000 });
//       await page.click('[data-tag="Users"]');
//       await page.waitForTimeout(1000);
      
//       const screenshot = await page.screenshot({
//         fullPage: true,
//         type: 'png'
//       });

//       const screenshotPath = path.join(SCREENSHOT_DIR, 'api-docs-user-endpoints.png');
//       fs.writeFileSync(screenshotPath, screenshot);

//       const baselinePath = path.join(BASELINE_DIR, 'api-docs-user-endpoints.png');
//       if (fs.existsSync(baselinePath)) {
//         const isMatching = await compareScreenshots(screenshotPath, baselinePath);
//         expect(isMatching).toBe(true);
//       } else {
//         fs.writeFileSync(baselinePath, screenshot);
//         logger.warn(`Created baseline: ${baselinePath}`);
//       }
//     }, 30000);

//     it('should render course endpoints documentation', async () => {
//       await page.goto(`${BASE_URL}/api-docs`, { waitUntil: 'networkidle2' });
      
//       await page.waitForSelector('.swagger-ui', { timeout: 10000 });
//       await page.click('[data-tag="Courses"]');
//       await page.waitForTimeout(1000);
      
//       const screenshot = await page.screenshot({
//         fullPage: true,
//         type: 'png'
//       });

//       const screenshotPath = path.join(SCREENSHOT_DIR, 'api-docs-course-endpoints.png');
//       fs.writeFileSync(screenshotPath, screenshot);

//       const baselinePath = path.join(BASELINE_DIR, 'api-docs-course-endpoints.png');
//       if (fs.existsSync(baselinePath)) {
//         const isMatching = await compareScreenshots(screenshotPath, baselinePath);
//         expect(isMatching).toBe(true);
//       } else {
//         fs.writeFileSync(baselinePath, screenshot);
//         logger.warn(`Created baseline: ${baselinePath}`);
//       }
//     }, 30000);
//   });

//   describe('Error Page Visual Tests', () => {
//     it('should render 404 error page correctly', async () => {
//       await page.goto(`${BASE_URL}/nonexistent-page`, { waitUntil: 'networkidle2' });
      
//       // Wait for error content
//       await page.waitForSelector('body', { timeout: 5000 });
      
//       const screenshot = await page.screenshot({
//         fullPage: true,
//         type: 'png'
//       });

//       const screenshotPath = path.join(SCREENSHOT_DIR, 'error-page-404.png');
//       fs.writeFileSync(screenshotPath, screenshot);

//       const baselinePath = path.join(BASELINE_DIR, 'error-page-404.png');
//       if (fs.existsSync(baselinePath)) {
//         const isMatching = await compareScreenshots(screenshotPath, baselinePath);
//         expect(isMatching).toBe(true);
//       } else {
//         fs.writeFileSync(baselinePath, screenshot);
//         logger.warn(`Created baseline: ${baselinePath}`);
//       }
//     }, 15000);

//     it('should render validation error page correctly', async () => {
//       // Make a request that will trigger validation error
//       await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
      
//       // Submit invalid form data
//       await page.type('input[name="email"]', 'invalid-email');
//       await page.type('input[name="password"]', 'short');
//       await page.click('button[type="submit"]');
      
//       // Wait for error message
//       await page.waitForSelector('.error-message', { timeout: 5000 });
      
//       const screenshot = await page.screenshot({
//         fullPage: true,
//         type: 'png'
//       });

//       const screenshotPath = path.join(SCREENSHOT_DIR, 'error-page-validation.png');
//       fs.writeFileSync(screenshotPath, screenshot);

//       const baselinePath = path.join(BASELINE_DIR, 'error-page-validation.png');
//       if (fs.existsSync(baselinePath)) {
//         const isMatching = await compareScreenshots(screenshotPath, baselinePath);
//         expect(isMatching).toBe(true);
//       } else {
//         fs.writeFileSync(baselinePath, screenshot);
//         logger.warn(`Created baseline: ${baselinePath}`);
//       }
//     }, 15000);
//   });

//   describe('Responsive Design Tests', () => {
//     const viewports = [
//       { name: 'mobile', width: 375, height: 667 },
//       { name: 'tablet', width: 768, height: 1024 },
//       { name: 'desktop', width: 1920, height: 1080 }
//     ];

//     viewports.forEach(viewport => {
//       it(`should render API docs correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async () => {
//         await page.setViewport({ width: viewport.width, height: viewport.height });
//         await page.goto(`${BASE_URL}/api-docs`, { waitUntil: 'networkidle2' });
        
//         await page.waitForSelector('.swagger-ui', { timeout: 10000 });
        
//         const screenshot = await page.screenshot({
//           fullPage: true,
//           type: 'png'
//         });

//         const screenshotPath = path.join(SCREENSHOT_DIR, `api-docs-${viewport.name}-${viewport.width}x${viewport.height}.png`);
//         fs.writeFileSync(screenshotPath, screenshot);

//         const baselinePath = path.join(BASELINE_DIR, `api-docs-${viewport.name}-${viewport.width}x${viewport.height}.png`);
//         if (fs.existsSync(baselinePath)) {
//           const isMatching = await compareScreenshots(screenshotPath, baselinePath);
//           expect(isMatching).toBe(true);
//         } else {
//           fs.writeFileSync(baselinePath, screenshot);
//           logger.warn(`Created baseline: ${baselinePath}`);
//         }
//       }, 30000);
//     });
//   });

//   describe('API Response Visual Tests', () => {
//     it('should render JSON responses in readable format', async () => {
//       // Test API endpoint that returns JSON
//       const response = await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle2' });
      
//       // Get response content
//       const content = await page.content();
      
//       // Check if JSON is properly formatted
//       expect(content).toContain('[');
//       expect(content).toContain(']');
      
//       // Take screenshot of the page
//       const screenshot = await page.screenshot({
//         fullPage: true,
//         type: 'png'
//       });

//       const screenshotPath = path.join(SCREENSHOT_DIR, 'api-users-json-response.png');
//       fs.writeFileSync(screenshotPath, screenshot);

//       const baselinePath = path.join(BASELINE_DIR, 'api-users-json-response.png');
//       if (fs.existsSync(baselinePath)) {
//         const isMatching = await compareScreenshots(screenshotPath, baselinePath);
//         expect(isMatching).toBe(true);
//       } else {
//         fs.writeFileSync(baselinePath, screenshot);
//         logger.warn(`Created baseline: ${baselinePath}`);
//       }
//     }, 15000);

//     it('should render error responses consistently', async () => {
//       // Test API endpoint that returns error
//       const response = await page.goto(`${BASE_URL}/auth/login`, {
//         waitUntil: 'networkidle2',
//         method: 'POST',
//         postData: JSON.stringify({ email: 'invalid', password: 'invalid' }),
//         headers: { 'Content-Type': 'application/json' }
//       });
      
//       const screenshot = await page.screenshot({
//         fullPage: true,
//         type: 'png'
//       });

//       const screenshotPath = path.join(SCREENSHOT_DIR, 'api-error-response.png');
//       fs.writeFileSync(screenshotPath, screenshot);

//       const baselinePath = path.join(BASELINE_DIR, 'api-error-response.png');
//       if (fs.existsSync(baselinePath)) {
//         const isMatching = await compareScreenshots(screenshotPath, baselinePath);
//         expect(isMatching).toBe(true);
//       } else {
//         fs.writeFileSync(baselinePath, screenshot);
//         logger.warn(`Created baseline: ${baselinePath}`);
//       }
//     }, 15000);
//   });

//   /**
//    * Compare two screenshots and return true if they match
//    */
//   async function compareScreenshots(screenshotPath: string, baselinePath: string): Promise<boolean> {
//     try {
//       const { createCanvas, loadImage } = require('canvas');
//       const fs = require('fs');
      
//       // Load images
//       const screenshot = await loadImage(screenshotPath);
//       const baseline = await loadImage(baselinePath);
      
//       // Create canvas for comparison
//       const canvas = createCanvas(screenshot.width, screenshot.height);
//       const ctx = canvas.getContext('2d');
      
//       // Draw both images and compare
//       ctx.drawImage(screenshot, 0, 0);
//       const screenshotData = ctx.getImageData(0, 0, screenshot.width, screenshot.height);
      
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       ctx.drawImage(baseline, 0, 0);
//       const baselineData = ctx.getImageData(0, 0, baseline.width, baseline.height);
      
//       // Compare pixel by pixel
//       let diffPixels = 0;
//       const totalPixels = screenshot.width * screenshot.height;
//       const threshold = 0.01; // 1% difference threshold
      
//       for (let i = 0; i < screenshotData.data.length; i += 4) {
//         const rDiff = Math.abs(screenshotData.data[i] - baselineData.data[i]);
//         const gDiff = Math.abs(screenshotData.data[i + 1] - baselineData.data[i + 1]);
//         const bDiff = Math.abs(screenshotData.data[i + 2] - baselineData.data[i + 2]);
        
//         if (rDiff > 5 || gDiff > 5 || bDiff > 5) {
//           diffPixels++;
//         }
//       }
      
//       const diffPercentage = diffPixels / totalPixels;
//       const isMatching = diffPercentage <= threshold;
      
//       if (!isMatching) {
//         logger.warn(`Visual regression detected: ${(diffPercentage * 100).toFixed(2)}% difference`);
        
//         // Save diff image for debugging
//         const diffCanvas = createCanvas(screenshot.width, screenshot.height);
//         const diffCtx = diffCanvas.getContext('2d');
        
//         for (let i = 0; i < screenshotData.data.length; i += 4) {
//           const rDiff = Math.abs(screenshotData.data[i] - baselineData.data[i]);
//           const gDiff = Math.abs(screenshotData.data[i + 1] - baselineData.data[i + 1]);
//           const bDiff = Math.abs(screenshotData.data[i + 2] - baselineData.data[i + 2]);
          
//           if (rDiff > 5 || gDiff > 5 || bDiff > 5) {
//             diffCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
//             diffCtx.fillRect((i / 4) % screenshot.width, Math.floor(i / 4 / screenshot.width), 1, 1);
//           }
//         }
        
//         const diffBuffer = diffCanvas.toBuffer('image/png');
//         const diffPath = screenshotPath.replace('.png', '-diff.png');
//         fs.writeFileSync(diffPath, diffBuffer);
//       }
      
//       return isMatching;
//     } catch (error) {
//       logger.error('Error comparing screenshots:', error);
//       return false;
//     }
//   }
// });

// /**
//  * Helper function to wait for element with timeout
//  */
// async function waitForElement(page: puppeteer.Page, selector: string, timeout: number = 5000): Promise<void> {
//   try {
//     await page.waitForSelector(selector, { timeout });
//   } catch (error) {
//     logger.warn(`Element not found within timeout: ${selector}`);
//   }
// }

// /**
//  * Helper function to take stable screenshot
//  */
// async function takeStableScreenshot(page: puppeteer.Page, path: string): Promise<void> {
//   // Wait for page to be stable
//   await page.waitForTimeout(1000);
  
//   // Take screenshot
//   const screenshot = await page.screenshot({
//     fullPage: true,
//     type: 'png'
//   });
  
//   fs.writeFileSync(path, screenshot);
// }
