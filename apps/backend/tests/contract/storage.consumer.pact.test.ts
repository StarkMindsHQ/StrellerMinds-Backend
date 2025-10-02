import { Pact, Matchers } from '@pact-foundation/pact';
import { CloudinaryService } from '../../../src/cloudinary/cloudinary.service';
import { AwsCloudFrontService } from '../../../src/video-streaming/services/aws-cloudfront.service';
import path from 'path';

describe('Cloud Storage Service Consumer Pact', () => {
  const provider = new Pact({
    consumer: 'StrellerMinds-Backend',
    provider: 'CloudStorageService',
    port: 1236,
    log: path.resolve(process.cwd(), 'logs', 'storage-pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  let cloudinaryService: CloudinaryService;
  let awsCloudFrontService: AwsCloudFrontService;

  beforeAll(() => {
    return provider.setup().then(() => {
      // Create service instances
      cloudinaryService = new CloudinaryService();
      awsCloudFrontService = new AwsCloudFrontService({} as any); // configService

      // Override the cloudinary uploader for testing
      (cloudinaryService as any).cloudinary = {
        uploader: {
          upload_stream: jest.fn(),
          upload: jest.fn(),
          destroy: jest.fn(),
        },
      };

      // Override the AWS S3 client for testing
      (awsCloudFrontService as any).s3Client = {
        send: jest.fn(),
      };
    });
  });

  afterAll(() => {
    return provider.finalize();
  });

  describe('Cloud Storage Service', () => {
    it('should upload file successfully', () => {
      const filePath = '/uploads/course-video-intro.mp4';
      const fileContent = 'Mock file content for testing';
      const expectedResponse = {
        fileUrl:
          'https://res.cloudinary.com/strellerminds/video/upload/v1234567890/course-video-intro.mp4',
        publicId: 'course-video-intro',
        secureUrl:
          'https://res.cloudinary.com/strellerminds/video/upload/v1234567890/course-video-intro.mp4',
        format: 'mp4',
        resourceType: 'video',
        bytes: 1024000,
        width: 1920,
        height: 1080,
        duration: 120.5,
      };

      return provider
        .addInteraction({
          state: 'cloud storage service is available',
          uponReceiving: 'a request to upload a file',
          withRequest: {
            method: 'PUT',
            path: filePath,
            headers: {
              'Content-Type': 'video/mp4',
              'Content-Length': Matchers.string(fileContent.length.toString()),
            },
            body: Matchers.like(fileContent),
          },
          willRespondWith: {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              fileUrl: Matchers.like(expectedResponse.fileUrl),
              publicId: Matchers.like(expectedResponse.publicId),
              secureUrl: Matchers.like(expectedResponse.secureUrl),
              format: Matchers.like(expectedResponse.format),
              resourceType: Matchers.like(expectedResponse.resourceType),
              bytes: Matchers.integer(expectedResponse.bytes),
              width: Matchers.integer(expectedResponse.width),
              height: Matchers.integer(expectedResponse.height),
              duration: Matchers.decimal(expectedResponse.duration),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the cloudinary upload method
            (cloudinaryService as any).cloudinary.uploader.upload.mockImplementation(
              (filePath, options, callback) => {
                callback(null, expectedResponse);
              },
            );

            // Call the actual service method
            const result = await cloudinaryService.uploadVideoFromPath(filePath);

            // Assert the result
            expect(result).toBeDefined();
            expect(result.secure_url).toBe(expectedResponse.secureUrl);
            expect(result.public_id).toBe(expectedResponse.publicId);
            expect(result.format).toBe(expectedResponse.format);
          });
        });
    });

    it('should upload image successfully', () => {
      const imagePath = '/uploads/profile-picture.jpg';
      const imageContent = 'Mock image content for testing';
      const expectedResponse = {
        fileUrl:
          'https://res.cloudinary.com/strellerminds/image/upload/v1234567890/profile-picture.jpg',
        publicId: 'profile-picture',
        secureUrl:
          'https://res.cloudinary.com/strellerminds/image/upload/v1234567890/profile-picture.jpg',
        format: 'jpg',
        resourceType: 'image',
        bytes: 512000,
        width: 512,
        height: 512,
      };

      return provider
        .addInteraction({
          state: 'cloud storage service supports image uploads',
          uponReceiving: 'a request to upload an image',
          withRequest: {
            method: 'PUT',
            path: imagePath,
            headers: {
              'Content-Type': 'image/jpeg',
              'Content-Length': Matchers.string(imageContent.length.toString()),
            },
            body: Matchers.like(imageContent),
          },
          willRespondWith: {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              fileUrl: Matchers.like(expectedResponse.fileUrl),
              publicId: Matchers.like(expectedResponse.publicId),
              secureUrl: Matchers.like(expectedResponse.secureUrl),
              format: Matchers.like(expectedResponse.format),
              resourceType: Matchers.like(expectedResponse.resourceType),
              bytes: Matchers.integer(expectedResponse.bytes),
              width: Matchers.integer(expectedResponse.width),
              height: Matchers.integer(expectedResponse.height),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the cloudinary upload_stream method
            (cloudinaryService as any).cloudinary.uploader.upload_stream.mockImplementation(
              (options, callback) => {
                callback(null, expectedResponse);
                return { end: jest.fn() };
              },
            );

            // Create a mock file object
            const mockFile = {
              buffer: Buffer.from(imageContent),
              originalname: 'profile-picture.jpg',
              mimetype: 'image/jpeg',
            } as Express.Multer.File;

            // Call the actual service method
            const result = await cloudinaryService.uploadImage(mockFile);

            // Assert the result
            expect(result).toBeDefined();
            expect(result.secure_url).toBe(expectedResponse.secureUrl);
            expect(result.public_id).toBe(expectedResponse.publicId);
            expect(result.format).toBe(expectedResponse.format);
          });
        });
    });

    it('should delete file successfully', () => {
      const publicId = 'course-video-intro';
      const expectedResponse = {
        result: 'ok',
        publicId: publicId,
      };

      return provider
        .addInteraction({
          state: 'file exists in cloud storage',
          uponReceiving: 'a request to delete a file',
          withRequest: {
            method: 'DELETE',
            path: `/delete/${publicId}`,
            headers: {
              Accept: 'application/json',
            },
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              result: Matchers.like(expectedResponse.result),
              publicId: Matchers.like(expectedResponse.publicId),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the cloudinary destroy method
            (cloudinaryService as any).cloudinary.uploader.destroy.mockResolvedValue(
              expectedResponse,
            );

            // Call the actual service method
            const result = await cloudinaryService.deleteImage(publicId);

            // Assert the result
            expect(result).toBeDefined();
            expect(result.result).toBe(expectedResponse.result);
            expect(result.public_id).toBe(expectedResponse.publicId);
          });
        });
    });

    it('should handle upload failure', () => {
      const filePath = '/uploads/corrupted-file.mp4';
      const fileContent = 'Corrupted file content';
      const errorResponse = {
        error: {
          message: 'Invalid file format',
          http_code: 400,
        },
      };

      return provider
        .addInteraction({
          state: 'cloud storage service rejects invalid files',
          uponReceiving: 'a request to upload an invalid file',
          withRequest: {
            method: 'PUT',
            path: filePath,
            headers: {
              'Content-Type': 'video/mp4',
              'Content-Length': Matchers.string(fileContent.length.toString()),
            },
            body: Matchers.like(fileContent),
          },
          willRespondWith: {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              error: {
                message: Matchers.like(errorResponse.error.message),
                http_code: Matchers.integer(errorResponse.error.http_code),
              },
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the cloudinary upload method to throw an error
            (cloudinaryService as any).cloudinary.uploader.upload.mockImplementation(
              (filePath, options, callback) => {
                callback(errorResponse, null);
              },
            );

            // Call the service method and expect it to throw
            await expect(cloudinaryService.uploadVideoFromPath(filePath)).rejects.toThrow();
          });
        });
    });

    it('should upload to AWS S3 successfully', () => {
      const s3Key = 'videos/course-intro.mp4';
      const fileBuffer = Buffer.from('Mock video content');
      const expectedResponse = {
        key: s3Key,
        url: `https://strellerminds-bucket.s3.us-east-1.amazonaws.com/${s3Key}`,
        cdnUrl: `https://d1234567890.cloudfront.net/${s3Key}`,
        etag: 'abc123def456',
        size: fileBuffer.length,
      };

      return provider
        .addInteraction({
          state: 'AWS S3 service is available',
          uponReceiving: 'a request to upload video to S3',
          withRequest: {
            method: 'PUT',
            path: `/${s3Key}`,
            headers: {
              'Content-Type': 'video/mp4',
              'Content-Length': Matchers.string(fileBuffer.length.toString()),
            },
            body: Matchers.like(fileBuffer.toString()),
          },
          willRespondWith: {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
              ETag: Matchers.like(expectedResponse.etag),
            },
            body: {
              key: Matchers.like(expectedResponse.key),
              url: Matchers.like(expectedResponse.url),
              cdnUrl: Matchers.like(expectedResponse.cdnUrl),
              etag: Matchers.like(expectedResponse.etag),
              size: Matchers.integer(expectedResponse.size),
            },
          },
        })
        .then(() => {
          return provider.executeTest(async () => {
            // Mock the S3 client send method
            (awsCloudFrontService as any).s3Client.send.mockResolvedValue({
              ETag: `"${expectedResponse.etag}"`,
            });

            // Call the actual service method
            const result = await awsCloudFrontService.uploadVideo(fileBuffer, s3Key, 'video/mp4');

            // Assert the result
            expect(result).toBeDefined();
            expect(result.key).toBe(expectedResponse.key);
            expect(result.url).toBe(expectedResponse.url);
            expect(result.cdnUrl).toBe(expectedResponse.cdnUrl);
            expect(result.etag).toBe(expectedResponse.etag);
            expect(result.size).toBe(expectedResponse.size);
          });
        });
    });
  });
});
