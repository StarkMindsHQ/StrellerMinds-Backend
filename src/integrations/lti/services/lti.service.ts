import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class LtiService {
  private readonly logger = new Logger(LtiService.name);

  constructor(private jwtService: JwtService) {}

  /**
   * Validate LTI launch token
   */
  async validateLaunchToken(idToken: string, clientId: string, clientSecret: string): Promise<any> {
    try {
      const decoded = this.jwtService.decode(idToken, { complete: true }) as any;
      
      if (!decoded || !decoded.payload) {
        throw new UnauthorizedException('Invalid token format');
      }

      const { iss, aud, iat, exp } = decoded.payload;

      // Validate required claims
      if (!iss || !aud) {
        throw new UnauthorizedException('Missing required claims');
      }

      // Validate audience
      if (aud !== clientId && !Array.isArray(aud) || (Array.isArray(aud) && !aud.includes(clientId))) {
        throw new UnauthorizedException('Invalid audience');
      }

      // Validate expiration
      const now = Math.floor(Date.now() / 1000);
      if (exp && exp < now) {
        throw new UnauthorizedException('Token expired');
      }

      return decoded.payload;
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      throw new UnauthorizedException('Token validation failed');
    }
  }

  /**
   * Generate LTI JWT for API calls
   */
  generateJwt(
    clientId: string,
    clientSecret: string,
    scope: string[],
    expiresIn: number = 3600,
  ): string {
    const payload = {
      iss: clientId,
      sub: clientId,
      aud: ['https://api.example.com'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };

    return this.jwtService.sign(payload, {
      secret: clientSecret,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate JWKS (JSON Web Key Set) for platform
   */
  generateJwks(kid: string, publicKey: string): any {
    return {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          kid,
          alg: 'RS256',
          n: this.extractKeyComponent(publicKey, 'n'),
          e: this.extractKeyComponent(publicKey, 'e'),
        },
      ],
    };
  }

  /**
   * Verify LTI response from platform
   */
  async verifyPlatformResponse(
    token: string,
    publicKey: string,
  ): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token, {
        key: publicKey,
        algorithms: ['RS256'],
      });
      return decoded;
    } catch (error) {
      this.logger.error(`Platform response verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid platform response');
    }
  }

  /**
   * Create Assignment (LineItem)
   */
  createLineItem(
    accessToken: string,
    contextId: string,
    title: string,
    maxScore: number,
    dueDate?: string,
  ): Promise<any> {
    return this.callAgsApi('/assignments', 'POST', accessToken, {
      title,
      scoreMaximum: maxScore,
      dueDate,
      contextId,
    });
  }

  /**
   * Submit Grade to Platform
   */
  async submitGrade(
    accessToken: string,
    lineItemId: string,
    userId: string,
    score: number,
    maxScore: number,
    comment?: string,
  ): Promise<any> {
    const payload = {
      timestamp: new Date().toISOString(),
      userId,
      scoreGiven: score,
      scoreMaximum: maxScore,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      comment,
    };

    return this.callAgsApi(
      `/lineItems/${lineItemId}/scores`,
      'POST',
      accessToken,
      payload,
    );
  }

  /**
   * Fetch results from platform
   */
  async fetchResults(
    accessToken: string,
    lineItemId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<any> {
    return this.callAgsApi(
      `/lineItems/${lineItemId}/results?limit=${limit}&offset=${offset}`,
      'GET',
      accessToken,
    );
  }

  /**
   * Get course members
   */
  async getMembers(
    accessToken: string,
    contextId: string,
    limit: number = 100,
  ): Promise<any> {
    return this.callNrpsApi(
      `/contexts/${contextId}/memberships?limit=${limit}`,
      'GET',
      accessToken,
    );
  }

  /**
   * Map LTI user to local user
   */
  mapLtiUser(ltiUser: any): any {
    return {
      externalId: ltiUser.sub,
      email: ltiUser.email,
      firstName: ltiUser.given_name || '',
      lastName: ltiUser.family_name || '',
      fullName: ltiUser.name,
      picture: ltiUser.picture,
      platformId: ltiUser.iss,
      roles: ltiUser['https://purl.imsglobal.org/spec/lti/claim/roles'] || [],
      locale: ltiUser.locale,
    };
  }

  /**
   * Map LTI course to local course
   */
  mapLtiCourse(ltiContext: any, ltiClaim: any): any {
    return {
      externalId: ltiContext.id,
      name: ltiContext.title || ltiContext.label,
      description: ltiClaim.course_name,
      code: ltiClaim.course_code,
      platform: ltiClaim.deployment_id,
      metadata: {
        type: ltiClaim.context_type,
        label: ltiContext.label,
      },
    };
  }

  // Private helper methods

  private async callAgsApi(
    endpoint: string,
    method: string,
    accessToken: string,
    data?: any,
  ): Promise<any> {
    // Implementation would use axios or similar
    throw new Error('Not implemented');
  }

  private async callNrpsApi(
    endpoint: string,
    method: string,
    accessToken: string,
    data?: any,
  ): Promise<any> {
    // Implementation would use axios or similar
    throw new Error('Not implemented');
  }

  private extractKeyComponent(publicKey: string, component: string): string {
    // Extract RSA key components from PEM
    // This is a simplified version
    return Buffer.from(publicKey).toString('base64');
  }
}
