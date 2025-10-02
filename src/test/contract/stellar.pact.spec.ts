import { createPact } from './pactHelper';
import axios from 'axios';

describe('Stellar Horizon API Pact', () => {
  const provider = createPact('stellar-horizon');

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  describe('when a transaction lookup is requested', () => {
    beforeAll(() =>
      provider.addInteraction({
        state: 'transaction exists',
        uponReceiving: 'a request for transaction by ID',
        withRequest: {
          method: 'GET',
          path: '/transactions/12345',
        },
        willRespondWith: {
          status: 200,
          body: {
            id: '12345',
            successful: true,
          },
        },
      }),
    );

    it('returns the expected transaction', async () => {
      const response = await axios.get(`${provider.mockService.baseUrl}/transactions/12345`);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe('12345');
    });
  });
});
