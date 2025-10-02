import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { IpfsService } from './ipfs.service';

/**
 * Controller for IPFS operations: add and retrieve content from IPFS.
 */
@ApiTags('IPFS')
@Controller('ipfs')
export class IpfsController {
  constructor(private readonly ipfsService: IpfsService) {}

  /**
   * Add content to IPFS and return its CID.
   * @param content The content to store on IPFS.
   * @returns The CID of the stored content.
   */
  @Post('add')
  @ApiOperation({
    summary: 'Add content to IPFS',
    description: 'Stores content on IPFS and returns the CID.',
  })
  @ApiBody({
    schema: {
      properties: { content: { type: 'string', description: 'Content to store on IPFS' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Content added to IPFS',
    schema: { properties: { cid: { type: 'string', description: 'Content Identifier (CID)' } } },
  })
  async addContent(@Body('content') content: string) {
    const cid = await this.ipfsService.addFile(Buffer.from(content));
    return { cid };
  }

  /**
   * Retrieve content from IPFS by CID.
   * @param cid The Content Identifier.
   * @returns The content retrieved from IPFS.
   */
  @Get('get/:cid')
  @ApiOperation({
    summary: 'Get content from IPFS',
    description: 'Retrieves content from IPFS using the CID.',
  })
  @ApiParam({ name: 'cid', description: 'Content Identifier (CID)' })
  @ApiResponse({
    status: 200,
    description: 'Content retrieved from IPFS',
    schema: { properties: { content: { type: 'string', description: 'Content from IPFS' } } },
  })
  async getContent(@Param('cid') cid: string) {
    const content = await this.ipfsService.getFile(cid);
    return { content };
  }
}
