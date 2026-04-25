/**
 * Jest global test setup
 *
 * Suppresses console.error / console.warn noise produced by the
 * GlobalExceptionFilter and SecureLoggerService when intentional
 * error scenarios (404s, 500s) are exercised in unit/integration tests.
 *
 * Errors are still thrown and caught by tests – this only prevents
 * the log output from polluting the test reporter.
 */
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterAll(() => {
  jest.restoreAllMocks();
});
