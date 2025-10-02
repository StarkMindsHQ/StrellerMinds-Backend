import { createPact } from './pactHelper';
import axios from 'axios';

describe('SMTP Provider Pact', () => {
  const provider = createPact('smtp-provider');

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  describe('when sending an email', () => {
    beforeAll(() =>
      provider.addInteraction({
        state: 'ready to send email',
        uponReceiving: 'a sendMail request',
        withRequest: {
          method: 'POST',
          path: '/send',
          body: {
            to: 'user@example.com',
            subject: 'Hello',
            text: 'Test email',
          },
        },
        willRespondWith: {
          status: 200,
          body: { success: true },
        },
      }),
    );

    it('returns a success response', async () => {
      const res = await axios.post(`${provider.mockService.baseUrl}/send`, {
        to: 'user@example.com',
        subject: 'Hello',
        text: 'Test email',
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });
});
