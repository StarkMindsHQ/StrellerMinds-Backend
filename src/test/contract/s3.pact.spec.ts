import { createPact } from './pactHelper';
import axios from 'axios';

describe('S3 Pact', () => {
  const provider = createPact('s3-localstack');

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  describe('when uploading an object', () => {
    beforeAll(() =>
      provider.addInteraction({
        state: 'bucket exists',
        uponReceiving: 'a PUT object request',
        withRequest: {
          method: 'PUT',
          path: '/my-bucket/my-object.txt',
          body: 'Hello world',
        },
        willRespondWith: {
          status: 200,
        },
      }),
    );

    it('uploads successfully', async () => {
      const res = await axios.put(
        `${provider.mockService.baseUrl}/my-bucket/my-object.txt`,
        'Hello world',
      );
      expect(res.status).toBe(200);
    });
  });
});
