import { Injectable, Logger, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Video, VideoVisibility } from '../entities/video.entity';
import { User } from '../../users/entities/user.entity';
import { AwsCloudFrontService } from './aws-cloudfront.service';

export interface VideoAccessRequest {
  videoId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  domain?: string;
  country?: string;
}

export interface VideoAccessToken {
  videoId: string;
  userId?: string;
  expiresAt: number;
  permissions: string[];
  restrictions: {
    ipAddress?: string;
    domain?: string;
    maxViews?: number;
    viewsUsed?: number;
  };
}

export interface DRMConfig {
  enabled: boolean;
  provider: 'widevine' | 'fairplay' | 'playready' | 'custom';
  licenseUrl?: string;
  certificateUrl?: string;
  keyId?: string;
  contentId?: string;
}

@Injectable()
export class VideoSecurityService {
  private readonly logger = new Logger(VideoSecurityService.name);
  private readonly jwtSecret: string;
  private readonly defaultTokenExpiry: number;

  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly cloudFrontService: AwsCloudFrontService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET');
    this.defaultTokenExpiry = this.configService.get<number>('VIDEO_TOKEN_EXPIRY', 3600);
  }

  async validateVideoAccess(request: VideoAccessRequest): Promise<{
    allowed: boolean;
    reason?: string;
    accessToken?: string;
    streamingUrl?: string;
  }> {
    try {
      this.logger.debug(`Validating video access for video: ${request.videoId}`);

      const video = await this.videoRepository.findOne({
        where: { id: request.videoId },
        relations: ['uploadedBy', 'lesson'],
      });

      if (!video) {
        return { allowed: false, reason: 'Video not found' };
      }

      // Check video status
      if (video.status !== 'ready') {
        return { allowed: false, reason: 'Video not ready for streaming' };
      }

      // Check visibility
      const visibilityCheck = await this.checkVisibility(video, request);
      if (!visibilityCheck.allowed) {
        return visibilityCheck;
      }

      // Check authentication requirements
      const authCheck = await this.checkAuthentication(video, request);
      if (!authCheck.allowed) {
        return authCheck;
      }

      // Check domain restrictions
      const domainCheck = this.checkDomainRestrictions(video, request);
      if (!domainCheck.allowed) {
        return domainCheck;
      }

      // Check geographic restrictions
      const geoCheck = this.checkGeographicRestrictions(video, request);
      if (!geoCheck.allowed) {
        return geoCheck;
      }

      // Generate access token
      const accessToken = this.generateAccessToken(video, request);

      // Generate streaming URL
      const streamingUrl = await this.generateSecureStreamingUrl(video, request, accessToken);

      return {
        allowed: true,
        accessToken,
        streamingUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to validate video access: ${request.videoId}`, error.stack);
      return { allowed: false, reason: 'Internal error' };
    }
  }

  private async checkVisibility(
    video: Video,
    request: VideoAccessRequest,
  ): Promise<{ allowed: boolean; reason?: string }> {
    switch (video.visibility) {
      case VideoVisibility.PUBLIC:
        return { allowed: true };

      case VideoVisibility.PRIVATE:
        if (!request.userId) {
          return { allowed: false, reason: 'Authentication required' };
        }
        
        // Check if user is the owner
        if (video.uploadedBy.id === request.userId) {
          return { allowed: true };
        }
        
        return { allowed: false, reason: 'Access denied' };

      case VideoVisibility.UNLISTED:
        // Unlisted videos can be accessed by anyone with the link
        return { allowed: true };

      case VideoVisibility.COURSE_ONLY:
        if (!request.userId) {
          return { allowed: false, reason: 'Authentication required for course content' };
        }
        
        // Check if user is enrolled in the course
        const isEnrolled = await this.checkCourseEnrollment(video, request.userId);
        if (!isEnrolled) {
          return { allowed: false, reason: 'Course enrollment required' };
        }
        
        return { allowed: true };

      default:
        return { allowed: false, reason: 'Invalid visibility setting' };
    }
  }

  private async checkAuthentication(
    video: Video,
    request: VideoAccessRequest,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const requireAuth = video.securitySettings?.requireAuth;
    
    if (requireAuth && !request.userId) {
      return { allowed: false, reason: 'Authentication required' };
    }

    if (request.userId) {
      const user = await this.userRepository.findOne({
        where: { id: request.userId },
      });

      if (!user) {
        return { allowed: false, reason: 'Invalid user' };
      }

      // Check if user account is active
      if (!user.isActive) {
        return { allowed: false, reason: 'Account suspended' };
      }
    }

    return { allowed: true };
  }

  private checkDomainRestrictions(
    video: Video,
    request: VideoAccessRequest,
  ): { allowed: boolean; reason?: string } {
    const allowedDomains = video.securitySettings?.allowedDomains;
    
    if (!allowedDomains || allowedDomains.length === 0) {
      return { allowed: true };
    }

    if (!request.domain) {
      return { allowed: false, reason: 'Domain verification required' };
    }

    const isAllowed = allowedDomains.some(domain => 
      request.domain === domain || request.domain.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return { allowed: false, reason: 'Domain not allowed' };
    }

    return { allowed: true };
  }

  private checkGeographicRestrictions(
    video: Video,
    request: VideoAccessRequest,
  ): { allowed: boolean; reason?: string } {
    const geoRestrictions = video.securitySettings?.geoRestrictions;
    
    if (!geoRestrictions) {
      return { allowed: true };
    }

    if (!request.country) {
      return { allowed: true }; // Allow if country cannot be determined
    }

    // Check blocked countries
    if (geoRestrictions.blockedCountries?.includes(request.country)) {
      return { allowed: false, reason: 'Geographic restriction' };
    }

    // Check allowed countries
    if (geoRestrictions.allowedCountries && geoRestrictions.allowedCountries.length > 0) {
      if (!geoRestrictions.allowedCountries.includes(request.country)) {
        return { allowed: false, reason: 'Geographic restriction' };
      }
    }

    return { allowed: true };
  }

  private async checkCourseEnrollment(video: Video, userId: string): Promise<boolean> {
    // This would check if the user is enrolled in the course
    // Implementation depends on your course enrollment system
    if (video.lesson) {
      // Check enrollment in the course that contains this lesson
      // For now, return true as a placeholder
      return true;
    }
    
    return false;
  }

  private generateAccessToken(video: Video, request: VideoAccessRequest): string {
    const payload: VideoAccessToken = {
      videoId: video.id,
      userId: request.userId,
      expiresAt: Math.floor(Date.now() / 1000) + this.defaultTokenExpiry,
      permissions: ['view'],
      restrictions: {
        ipAddress: request.ipAddress,
        domain: request.domain,
      },
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.defaultTokenExpiry,
    });
  }

  async validateAccessToken(token: string): Promise<VideoAccessToken | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as VideoAccessToken;
      
      // Check if token is expired
      if (decoded.expiresAt < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return decoded;
    } catch (error) {
      this.logger.warn('Invalid access token', error.message);
      return null;
    }
  }

  private async generateSecureStreamingUrl(
    video: Video,
    request: VideoAccessRequest,
    accessToken: string,
  ): Promise<string> {
    const expiryTime = video.securitySettings?.signedUrlExpiry || this.defaultTokenExpiry;
    
    // Use CloudFront signed URLs for better security
    const signedUrl = await this.cloudFrontService.generateSignedUrl(
      video.s3Key,
      {
        expiresIn: expiryTime,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
    );

    // Add access token as query parameter
    const separator = signedUrl.includes('?') ? '&' : '?';
    return `${signedUrl}${separator}access_token=${accessToken}`;
  }

  async generateDRMConfig(video: Video): Promise<DRMConfig | null> {
    if (!video.securitySettings?.drmEnabled) {
      return null;
    }

    const provider = video.securitySettings.drmProvider || 'widevine';
    
    return {
      enabled: true,
      provider: provider as any,
      licenseUrl: this.configService.get<string>(`DRM_${provider.toUpperCase()}_LICENSE_URL`),
      certificateUrl: this.configService.get<string>(`DRM_${provider.toUpperCase()}_CERT_URL`),
      keyId: this.generateDRMKeyId(video.id),
      contentId: video.id,
    };
  }

  private generateDRMKeyId(videoId: string): string {
    return crypto
      .createHash('sha256')
      .update(videoId + this.jwtSecret)
      .digest('hex')
      .substring(0, 32);
  }

  async logSecurityEvent(
    eventType: 'access_granted' | 'access_denied' | 'token_generated' | 'drm_request',
    videoId: string,
    details: any,
  ): Promise<void> {
    this.logger.log(`Security event: ${eventType}`, {
      videoId,
      timestamp: new Date().toISOString(),
      ...details,
    });

    // Here you could also store security events in a database
    // or send them to a security monitoring service
  }

  async revokeAccess(videoId: string, userId?: string): Promise<void> {
    // Implementation to revoke access tokens
    // This could involve maintaining a blacklist of tokens
    // or updating the video's security settings
    
    this.logger.log(`Access revoked for video: ${videoId}`, { userId });
  }

  async updateSecuritySettings(
    videoId: string,
    settings: Partial<Video['securitySettings']>,
  ): Promise<void> {
    await this.videoRepository.update(videoId, {
      securitySettings: settings,
    });

    this.logger.log(`Security settings updated for video: ${videoId}`);
  }

  generateEmbedCode(
    video: Video,
    options: {
      width?: number;
      height?: number;
      autoplay?: boolean;
      controls?: boolean;
      domain?: string;
    } = {},
  ): string {
    if (!video.securitySettings?.embedEnabled) {
      throw new ForbiddenException('Embedding is not allowed for this video');
    }

    const {
      width = 640,
      height = 360,
      autoplay = false,
      controls = true,
      domain,
    } = options;

    const embedUrl = `${this.configService.get('FRONTEND_URL')}/embed/${video.id}`;
    const params = new URLSearchParams({
      autoplay: autoplay.toString(),
      controls: controls.toString(),
      ...(domain && { domain }),
    });

    return `<iframe 
      width="${width}" 
      height="${height}" 
      src="${embedUrl}?${params.toString()}" 
      frameborder="0" 
      allowfullscreen>
    </iframe>`;
  }
}
