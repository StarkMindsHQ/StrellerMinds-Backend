import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { IpfsService } from './ipfs.service';

@Controller('ipfs')
export class IpfsController {
  constructor(private readonly ipfsService: IpfsService) {}

  @Post('add')
  async addContent(@Body('content') content: string) {
    const cid = await this.ipfsService.addFile(Buffer.from(content));
    return { cid };
  }

  @Get('get/:cid')
  async getContent(@Param('cid') cid: string) {
    const content = await this.ipfsService.getFile(cid);
    return { content };
  }
}
