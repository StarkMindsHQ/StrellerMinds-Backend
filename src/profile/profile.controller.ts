import { Controller, Post, Delete, Body, BadRequestException, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

/**
 * Controller for user profile image upload and deletion.
 */
@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly cloudinaryService: CloudinaryService, //deps injection of claudinary service
  ) {}

  /**
   * Upload a profile image for the user.
   */
  @Post('upload')
  @ApiOperation({
    summary: 'Upload profile image',
    description: 'Uploads a profile image (JPEG, PNG, JPG, max 5MB) for the user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: { properties: { url: { type: 'string' }, publicId: { type: 'string' } } },
  })
  async uploadProfileImage(@Req() req: FastifyRequest) {
    const part = await (req as any).file();
    if (!part) {
      throw new BadRequestException('No file uploaded');
    }
    const file = {
      buffer: await part.toBuffer(),
      mimetype: part.mimetype,
      originalname: part.filename || part.fieldname,
      size: part.file?.bytesRead,
    } as any;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      throw new BadRequestException('File too large');
    }

    const result = await this.cloudinaryService.uploadImage(file);
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  /**
   * Delete a profile image by its public ID.
   */
  @Delete('delete')
  @ApiOperation({
    summary: 'Delete profile image',
    description: 'Deletes a profile image by its public ID.',
  })
  @ApiBody({
    schema: { properties: { publicId: { type: 'string', description: 'Cloudinary public ID' } } },
  })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  async deleteProfileImage(@Body('publicId') publicId: string) {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    await this.cloudinaryService.deleteImage(publicId);
    return { message: 'Image deleted successfully' };
  }
}
