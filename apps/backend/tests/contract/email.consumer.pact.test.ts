import { Pact, Matchers } from '@pact-foundation/pact';
import { EmailService } from '../../../src/email/email.service';
import path from 'path';

describe('Email Service Consumer Pact', () => {
  const provider = new Pact({
    consumer: 'StrellerMinds-Backend',
    provider: 'EmailService',
    port: 1235,
    log: path.resolve(process.cwd(), 'logs', 'email-pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  let emailService: EmailService;

  beforeAll(() => {
    return provider.setup().then(() => {
      // Create a new EmailService instance with the mock server URL
      emailService = new EmailService(
        {} as any, // configService
        undefined, // emailQueue
        undefined, // emailTemplateRepository
        undefined, // emailLogRepository
        undefined, // emailPreferenceRepository
        undefined, // jwtService
      );

      // Override the transporter to use our mock server
      (emailService as any).transporter = {
        sendMail: jest.fn(),
      };
    });
  });

  afterAll(() => {
    return provider.finalize();
  });

  describe('Email Service', () => {
    it('should send email successfully', () => {
      const emailRequest = {
        to: 'user@example.com',
        from: 'noreply@strellerminds.com',
        subject: 'Welcome to StrellerMinds',
        html: '<h1>Welcome!</h1><p>Thank you for joining StrellerMinds.</p>',
      };

      const expectedResponse = {
        messageId: '<20231201100000.12345@strellerminds.com>',
        accepted: ['user@example.com'],
        rejected: [],
        pending: [],
        response: '250 2.0.0 OK: queued as 20231201100000.12345',
      };

      return provider
        .addInteraction({
          state: 'email service is available',
          uponReceiving: 'a request to send an email',
          withRequest: {
            method: 'POST',
            path: '/send',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: {
              to: Matchers.like(emailRequest.to),
              from: Matchers.like(emailRequest.from),
              subject: Matchers.like(emailRequest.subject),
              html: Matchers.like(emailRequest.html),
            },
          },
          willRespondWith: {
            status: 202,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              messageId: Matchers.like(expectedResponse.messageId),
              accepted: Matchers.eachLike(Matchers.like(emailRequest.to)),
              rejected: Matchers.eachLike(Matchers.like('')),
              pending: Matchers.eachLike(Matchers.like('')),
              response: Matchers.like(expectedResponse.response),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the transporter.sendMail method to return our expected response
            (emailService as any).transporter.sendMail.mockResolvedValue(expectedResponse);

            // Call the actual service method
            const result = await emailService.sendImmediate({
              to: emailRequest.to,
              subject: emailRequest.subject,
              templateName: 'welcome',
              context: { userName: 'John Doe' },
            });

            // Assert the result
            expect(result).toBe(true);
          });
        });
    });

    it('should handle email sending failure', () => {
      const emailRequest = {
        to: 'invalid@example.com',
        from: 'noreply@strellerminds.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      const errorResponse = {
        code: 'EENVELOPE',
        response: '550 5.1.1 User unknown',
        responseCode: 550,
        command: 'RCPT TO',
      };

      return provider
        .addInteraction({
          state: 'email service rejects invalid recipient',
          uponReceiving: 'a request to send email to invalid recipient',
          withRequest: {
            method: 'POST',
            path: '/send',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: {
              to: Matchers.like(emailRequest.to),
              from: Matchers.like(emailRequest.from),
              subject: Matchers.like(emailRequest.subject),
              html: Matchers.like(emailRequest.html),
            },
          },
          willRespondWith: {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              code: Matchers.like(errorResponse.code),
              response: Matchers.like(errorResponse.response),
              responseCode: Matchers.integer(errorResponse.responseCode),
              command: Matchers.like(errorResponse.command),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the transporter.sendMail method to throw an error
            (emailService as any).transporter.sendMail.mockRejectedValue(
              new Error('Invalid recipient'),
            );

            // Call the service method and expect it to return false
            const result = await emailService.sendImmediate({
              to: emailRequest.to,
              subject: emailRequest.subject,
              templateName: 'test',
              context: {},
            });

            // Assert the result
            expect(result).toBe(false);
          });
        });
    });

    it('should send bulk emails successfully', () => {
      const bulkEmailRequest = {
        to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        from: 'noreply@strellerminds.com',
        subject: 'Course Update Notification',
        html: '<h2>Course Update</h2><p>Your course has been updated.</p>',
      };

      const expectedResponse = {
        messageId: '<20231201100001.67890@strellerminds.com>',
        accepted: bulkEmailRequest.to,
        rejected: [],
        pending: [],
        response: '250 2.0.0 OK: queued as 20231201100001.67890',
      };

      return provider
        .addInteraction({
          state: 'email service supports bulk sending',
          uponReceiving: 'a request to send bulk emails',
          withRequest: {
            method: 'POST',
            path: '/send',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: {
              to: Matchers.eachLike(Matchers.like('user@example.com')),
              from: Matchers.like(bulkEmailRequest.from),
              subject: Matchers.like(bulkEmailRequest.subject),
              html: Matchers.like(bulkEmailRequest.html),
            },
          },
          willRespondWith: {
            status: 202,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              messageId: Matchers.like(expectedResponse.messageId),
              accepted: Matchers.eachLike(Matchers.like('user@example.com')),
              rejected: Matchers.eachLike(Matchers.like('')),
              pending: Matchers.eachLike(Matchers.like('')),
              response: Matchers.like(expectedResponse.response),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the transporter.sendMail method to return our expected response
            (emailService as any).transporter.sendMail.mockResolvedValue(expectedResponse);

            // Call the actual service method
            const result = await emailService.sendImmediate({
              to: bulkEmailRequest.to,
              subject: bulkEmailRequest.subject,
              templateName: 'course-update',
              context: { courseName: 'Blockchain Fundamentals' },
            });

            // Assert the result
            expect(result).toBe(true);
          });
        });
    });
  });
});
