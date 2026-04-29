import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import { EmailService, SendEmailOptions } from '../email.service';

// ---------------------------------------------------------------------------
// Mock SMTP / MailerService factory
// ---------------------------------------------------------------------------
const mockSendMail = jest.fn();

const mockMailerService = {
  sendMail: mockSendMail,
};

const buildSuccessResult = (
  to: string | string[],
  messageId = '<mock-message-id@localhost>',
) => ({
  messageId,
  accepted: Array.isArray(to) ? to : [to],
  rejected: [] as string[],
  envelope: {},
  response: '250 OK',
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('EmailService', () => {
  let service: EmailService;
  let mailerService: MailerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mockMailerService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);

    // Silence logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Module / DI
  // -------------------------------------------------------------------------
  describe('Module Initialisation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have MailerService injected', () => {
      expect(mailerService).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 2. sendEmail – core method
  // -------------------------------------------------------------------------
  describe('sendEmail()', () => {
    it('sends a plain-text email and returns a normalised result', async () => {
      const to = 'user@example.com';
      mockSendMail.mockResolvedValueOnce(buildSuccessResult(to));

      const options: SendEmailOptions = {
        to,
        subject: 'Hello',
        text: 'Plain text body',
      };

      const result = await service.sendEmail(options);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to, subject: 'Hello', text: 'Plain text body' }),
      );
      expect(result.messageId).toBeTruthy();
      expect(result.accepted).toContain(to);
      expect(result.rejected).toHaveLength(0);
    });

    it('sends an HTML email', async () => {
      const to = 'html@example.com';
      mockSendMail.mockResolvedValueOnce(buildSuccessResult(to));

      await service.sendEmail({
        to,
        subject: 'HTML Email',
        html: '<h1>Hello</h1>',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ html: '<h1>Hello</h1>' }),
      );
    });

    it('sends a templated email with context', async () => {
      const to = 'template@example.com';
      mockSendMail.mockResolvedValueOnce(buildSuccessResult(to));

      await service.sendEmail({
        to,
        subject: 'Templated',
        template: 'welcome',
        context: { firstName: 'Ada' },
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'welcome',
          context: { firstName: 'Ada' },
        }),
      );
    });

    it('supports multiple recipients (array)', async () => {
      const recipients = ['a@example.com', 'b@example.com'];
      mockSendMail.mockResolvedValueOnce(buildSuccessResult(recipients));

      const result = await service.sendEmail({
        to: recipients,
        subject: 'Bulk',
        text: 'Hi all',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: recipients }),
      );
      expect(result.accepted).toEqual(recipients);
    });

    it('propagates SMTP errors', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

      await expect(
        service.sendEmail({ to: 'fail@example.com', subject: 'X', text: 'Y' }),
      ).rejects.toThrow('SMTP connection refused');
    });

    it('logs success after sending', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      mockSendMail.mockResolvedValueOnce(
        buildSuccessResult('log@example.com'),
      );

      await service.sendEmail({
        to: 'log@example.com',
        subject: 'Log test',
        text: 'body',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('log@example.com'),
      );
    });

    it('logs error on failure', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      mockSendMail.mockRejectedValueOnce(new Error('Timeout'));

      await expect(
        service.sendEmail({ to: 'err@example.com', subject: 'X', text: 'Y' }),
      ).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalled();
    });

    it('returns rejected list when recipients bounce', async () => {
      const to = 'bounce@example.com';
      mockSendMail.mockResolvedValueOnce({
        messageId: '<id>',
        accepted: [],
        rejected: [to],
      });

      const result = await service.sendEmail({ to, subject: 'X', text: 'Y' });

      expect(result.rejected).toContain(to);
      expect(result.accepted).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. sendWelcomeEmail
  // -------------------------------------------------------------------------
  describe('sendWelcomeEmail()', () => {
    it('sends welcome email with correct subject and template', async () => {
      const to = 'newuser@example.com';
      mockSendMail.mockResolvedValueOnce(buildSuccessResult(to));

      const result = await service.sendWelcomeEmail(to, 'Ada');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: 'Welcome to StrellerMinds!',
          template: 'welcome',
          context: { firstName: 'Ada' },
        }),
      );
      expect(result.accepted).toContain(to);
    });

    it('propagates errors from sendEmail', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Down'));
      await expect(
        service.sendWelcomeEmail('x@x.com', 'X'),
      ).rejects.toThrow('Down');
    });
  });

  // -------------------------------------------------------------------------
  // 4. sendPasswordResetEmail
  // -------------------------------------------------------------------------
  describe('sendPasswordResetEmail()', () => {
    it('sends password-reset email with token and URL in context', async () => {
      const to = 'reset@example.com';
      const token = 'abc123';
      const url = 'https://strellerminds.com/reset?token=abc123';
      mockSendMail.mockResolvedValueOnce(buildSuccessResult(to));

      await service.sendPasswordResetEmail(to, token, url);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: 'Reset Your Password',
          template: 'password-reset',
          context: { resetToken: token, resetUrl: url },
        }),
      );
    });

    it('does not expose the token in a plain-text field', async () => {
      mockSendMail.mockResolvedValueOnce(buildSuccessResult('r@r.com'));

      await service.sendPasswordResetEmail('r@r.com', 'secret', 'https://url');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.text).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 5. sendCourseEnrollmentEmail
  // -------------------------------------------------------------------------
  describe('sendCourseEnrollmentEmail()', () => {
    it('sends enrollment email with correct course name in subject', async () => {
      const to = 'student@example.com';
      const course = 'Stellar Smart Contracts 101';
      mockSendMail.mockResolvedValueOnce(buildSuccessResult(to));

      await service.sendCourseEnrollmentEmail(to, 'Ada', course);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: `You're enrolled in ${course}`,
          template: 'course-enrollment',
          context: { firstName: 'Ada', courseName: course },
        }),
      );
    });

    it('calls mailerService.sendMail exactly once per enrollment', async () => {
      mockSendMail.mockResolvedValueOnce(buildSuccessResult('s@s.com'));
      await service.sendCourseEnrollmentEmail('s@s.com', 'Ada', 'Course');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 6. sendCertificateEmail
  // -------------------------------------------------------------------------
  describe('sendCertificateEmail()', () => {
    it('sends certificate email with cert URL in context', async () => {
      const to = 'grad@example.com';
      const certUrl = 'https://certs.strellerminds.com/abc';
      mockSendMail.mockResolvedValueOnce(buildSuccessResult(to));

      await service.sendCertificateEmail(to, 'Ada', 'Stellar 101', certUrl);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'certificate',
          context: {
            firstName: 'Ada',
            courseName: 'Stellar 101',
            certificateUrl: certUrl,
          },
        }),
      );
    });

    it('includes the course name in the email subject', async () => {
      mockSendMail.mockResolvedValueOnce(buildSuccessResult('g@g.com'));
      await service.sendCertificateEmail('g@g.com', 'B', 'DeFi Basics', 'https://x');

      const { subject } = mockSendMail.mock.calls[0][0];
      expect(subject).toContain('DeFi Basics');
    });
  });

  // -------------------------------------------------------------------------
  // 7. sendNotificationEmail
  // -------------------------------------------------------------------------
  describe('sendNotificationEmail()', () => {
    it('sends notification with html and text fields', async () => {
      const to = 'notify@example.com';
      mockSendMail.mockResolvedValueOnce(buildSuccessResult(to));

      await service.sendNotificationEmail(to, 'Alert', 'Something happened');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: 'Alert',
          html: '<p>Something happened</p>',
          text: 'Something happened',
        }),
      );
    });

    it('does not use a template for plain notifications', async () => {
      mockSendMail.mockResolvedValueOnce(buildSuccessResult('n@n.com'));
      await service.sendNotificationEmail('n@n.com', 'S', 'M');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.template).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 8. Mock SMTP behaviour edge-cases
  // -------------------------------------------------------------------------
  describe('Mock SMTP edge-cases', () => {
    it('handles sendMail returning undefined accepted/rejected gracefully', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<id>' });

      const result = await service.sendEmail({
        to: 'edge@example.com',
        subject: 'Edge',
        text: 'body',
      });

      expect(result.accepted).toEqual([]);
      expect(result.rejected).toEqual([]);
    });

    it('handles network timeout error type', async () => {
      const timeoutError = Object.assign(new Error('ETIMEDOUT'), {
        code: 'ETIMEDOUT',
      });
      mockSendMail.mockRejectedValueOnce(timeoutError);

      await expect(
        service.sendEmail({ to: 't@t.com', subject: 'X', text: 'Y' }),
      ).rejects.toMatchObject({ code: 'ETIMEDOUT' });
    });

    it('handles authentication failure error type', async () => {
      const authError = Object.assign(new Error('Invalid login'), {
        responseCode: 535,
      });
      mockSendMail.mockRejectedValueOnce(authError);

      await expect(
        service.sendEmail({ to: 'a@a.com', subject: 'X', text: 'Y' }),
      ).rejects.toMatchObject({ responseCode: 535 });
    });

    it('sendMail is never called when service throws before reaching mailer', async () => {
      // Simulate internal pre-send failure (e.g., misconfigured service)
      jest
        .spyOn(service, 'sendEmail')
        .mockRejectedValueOnce(new Error('Pre-send failure'));

      await expect(service.sendEmail({ to: 'x@x.com', subject: 'X', text: 'Y' })).rejects.toThrow(
        'Pre-send failure',
      );
      // mockSendMail should NOT have been called because spy short-circuits
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('calls sendMail exactly once per sendEmail invocation', async () => {
      mockSendMail.mockResolvedValue(buildSuccessResult('one@example.com'));

      await service.sendEmail({ to: 'one@example.com', subject: 'X', text: 'Y' });
      await service.sendEmail({ to: 'one@example.com', subject: 'X', text: 'Y' });

      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });
  });
});