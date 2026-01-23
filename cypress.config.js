import { defineConfig } from 'cypress';
export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        supportFile: 'test/e2e/support/e2e.ts',
        specPattern: 'test/e2e/specs/**/*.cy.ts',
        fixturesFolder: 'test/e2e/fixtures',
        screenshotsFolder: 'test/e2e/screenshots',
        videosFolder: 'test/e2e/videos',
        downloadsFolder: 'test/e2e/downloads',
        // Viewport settings
        viewportWidth: 1280,
        viewportHeight: 720,
        // Test settings
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,
        pageLoadTimeout: 30000,
        // Video and screenshot settings
        video: true,
        videoCompression: 32,
        screenshotOnRunFailure: true,
        // Retry settings
        retries: {
            runMode: 2,
            openMode: 0,
        },
        // Environment variables
        env: {
            apiUrl: 'http://localhost:3000/api',
            testUser: {
                email: 'test@example.com',
                password: 'password123',
            },
            adminUser: {
                email: 'admin@example.com',
                password: 'admin123',
            },
        },
        setupNodeEvents(on, config) {
            // Task definitions
            on('task', {
                // Database tasks
                clearDatabase() {
                    // Implementation to clear test database
                    return null;
                },
                seedDatabase(data) {
                    // Implementation to seed test database
                    return null;
                },
                // API tasks
                createTestUser(userData) {
                    // Implementation to create test user via API
                    return null;
                },
                createTestCourse(courseData) {
                    // Implementation to create test course via API
                    return null;
                },
                // File system tasks
                readFile(filename) {
                    // Implementation to read files
                    return null;
                },
                writeFile({ filename, content }) {
                    // Implementation to write files
                    return null;
                },
                // Email tasks
                getLastEmail() {
                    // Implementation to get last sent email (for testing)
                    return null;
                },
                clearEmails() {
                    // Implementation to clear email queue
                    return null;
                },
            });
            // Plugin configurations
            on('before:browser:launch', (browser, launchOptions) => {
                if (browser.name === 'chrome') {
                    launchOptions.args.push('--disable-dev-shm-usage');
                    launchOptions.args.push('--no-sandbox');
                }
                return launchOptions;
            });
            // Code coverage (if using)
            // require('@cypress/code-coverage/task')(on, config);
            return config;
        },
    },
    component: {
        devServer: {
            framework: 'create-react-app',
            bundler: 'webpack',
        },
        supportFile: 'test/e2e/support/component.ts',
        specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
        indexHtmlFile: 'test/e2e/support/component-index.html',
    },
    // Global settings
    chromeWebSecurity: false,
    modifyObstructiveCode: false,
    experimentalStudio: true,
    experimentalWebKitSupport: true,
    // Reporter settings
    reporter: 'cypress-multi-reporters',
    reporterOptions: {
        configFile: 'test/e2e/config/reporter-config.json',
    },
});
