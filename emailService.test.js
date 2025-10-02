const { sendEmail, trackEmailAnalytics } = require('./emailService');

// Mock SendGrid's library
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(() => [{ statusCode: 202 }]),
}));

// Test cases

describe('Email Service Integration', () => {
  it('should send an email successfully', async () => {
    const response = await sendEmail(
      'test@example.com',
      'Test Subject',
      'Test text',
      '<p>Test HTML</p>',
    );
    expect(response[0].statusCode).toBe(202);
  });

  it('should track email analytics successfully', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    trackEmailAnalytics({ event: 'delivered' });
    expect(consoleSpy).toHaveBeenCalledWith('Email event:', { event: 'delivered' });
  });
});
