import { createHash } from 'crypto';
import { IpfsService } from './ipfs.service';
import { LocalIpfsClient } from './local-ipfs-client';

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

describe('IpfsService', () => {
  let service: IpfsService;
  let client: LocalIpfsClient;

  beforeEach(() => {
    client = new LocalIpfsClient();
    service = new IpfsService(client);
  });

  it('uploads content and returns a stable cid + sha256 + size', async () => {
    const content = Buffer.from('hello world');

    const result = await service.upload(content);

    expect(result.cid).toMatch(/^local-[a-f0-9]{64}$/);
    expect(result.sha256).toBe(sha256(content));
    expect(result.size).toBe(content.length);

    const second = await service.upload(content);
    expect(second.cid).toBe(result.cid);
  });

  it('fetches previously uploaded content by cid', async () => {
    const content = Buffer.from('streller-tax-return-2025');
    const { cid } = await service.upload(content);

    const fetched = await service.fetch(cid);

    expect(fetched.equals(content)).toBe(true);
  });

  it('verifies content matches the stored sha256', async () => {
    const content = Buffer.from('payment receipt #42');
    const { cid, sha256: digest } = await service.upload(content);

    const verification = await service.verify(cid, digest);

    expect(verification).toEqual({
      cid,
      expectedSha256: digest,
      actualSha256: digest,
      matches: true,
    });
  });

  it('reports a mismatch when the expected sha256 is wrong', async () => {
    const content = Buffer.from('w-2 form');
    const { cid, sha256: digest } = await service.upload(content);
    const wrong = '0'.repeat(64);

    const verification = await service.verify(cid, wrong);

    expect(verification.matches).toBe(false);
    expect(verification.actualSha256).toBe(digest);
    expect(verification.expectedSha256).toBe(wrong);
  });

  it('propagates the client error when fetching an unknown cid', async () => {
    await expect(service.fetch('local-unknown')).rejects.toThrow(
      /Content for CID "local-unknown" not found/,
    );
  });
});
