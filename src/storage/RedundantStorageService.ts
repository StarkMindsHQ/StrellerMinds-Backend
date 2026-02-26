import { Injectable } from "@nestjs/common";

@Injectable()
export class RedundantStorageService {
  constructor(
    private primary: any,
    private secondary: any,
  ) {}

  async upload(file: Buffer, path: string) {
    const primaryUrl = await this.primary.upload(file, path);
    await this.secondary.upload(file, path);
    return primaryUrl;
  }
}