export interface IpfsAddResult {
  cid: string;
  size: number;
}

export abstract class IpfsClient {
  abstract add(content: Buffer): Promise<IpfsAddResult>;
  abstract cat(cid: string): Promise<Buffer>;
}
