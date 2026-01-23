import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Query,
  Redirect,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SSOService } from '../services/sso.service';
import { SSOConfigService } from '../services/sso-config.service';
import { SSOConfigDto } from '../dto/sso.dto';

@Controller('integrations/sso')
export class SSOController {
  constructor(
    private ssoService: SSOService,
    private ssoConfigService: SSOConfigService,
  ) {}

  /**
   * Create SSO configuration
   */
  @Post('config')
  @UseGuards(JwtAuthGuard)
  async createSSOConfig(
    @CurrentUser() user: any,
    @Body() dto: SSOConfigDto,
  ) {
    const config = await this.ssoConfigService.createSSOConfig(
      user.id,
      dto.provider,
      dto.name,
      dto,
    );

    return {
      success: true,
      data: config,
      message: 'SSO configuration created successfully',
    };
  }

  /**
   * Get SSO configuration
   */
  @Get('config/:configId')
  @UseGuards(JwtAuthGuard)
  async getSSOConfig(
    @CurrentUser() user: any,
    @Param('configId') configId: string,
  ) {
    const config = await this.ssoConfigService.getSSOConfig(configId, user.id);
    if (!config) {
      throw new NotFoundException('SSO configuration not found');
    }

    return {
      success: true,
      data: config,
    };
  }

  /**
   * List all SSO configurations
   */
  @Get('configs')
  @UseGuards(JwtAuthGuard)
  async listSSOConfigs(
    @CurrentUser() user: any,
  ) {
    const configs = await this.ssoConfigService.listSSOConfigs(user.id);

    return {
      success: true,
      data: configs,
    };
  }

  /**
   * Update SSO configuration
   */
  @Put('config/:configId')
  @UseGuards(JwtAuthGuard)
  async updateSSOConfig(
    @CurrentUser() user: any,
    @Param('configId') configId: string,
    @Body() dto: Partial<SSOConfigDto>,
  ) {
    const config = await this.ssoConfigService.updateSSOConfig(configId, user.id, {
      credentials: dto,
    });

    return {
      success: true,
      data: config,
      message: 'SSO configuration updated successfully',
    };
  }

  /**
   * Activate SSO configuration
   */
  @Post('config/:configId/activate')
  @UseGuards(JwtAuthGuard)
  async activateSSOConfig(
    @CurrentUser() user: any,
    @Param('configId') configId: string,
  ) {
    const config = await this.ssoConfigService.activateSSOConfig(configId, user.id);

    return {
      success: true,
      data: config,
      message: 'SSO configuration activated',
    };
  }

  /**
   * OpenID Connect authorization endpoint
   */
  @Get('openid/auth/:configId')
  async openIDAuth(
    @Param('configId') configId: string,
  ) {
    // In a real implementation, fetch config from DB
    const state = this.ssoService.generateState();
    const nonce = this.ssoService.generateNonce();

    const config = {
      clientId: 'dummy',
      redirectUrl: `${process.env.API_URL}/integrations/sso/openid/callback`,
      authorizationUrl: 'https://auth.example.com/authorize',
      scopes: ['openid', 'profile', 'email'],
    };

    const authUrl = this.ssoService.generateOpenIDAuthUrl(config, state, nonce);

    return {
      success: true,
      data: { authUrl, state, nonce },
    };
  }

  /**
   * OpenID Connect callback endpoint
   */
  @Get('openid/callback')
  async openIDCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    try {
      const config = {
        clientId: 'dummy',
        clientSecret: 'dummy',
        redirectUrl: `${process.env.API_URL}/integrations/sso/openid/callback`,
        tokenUrl: 'https://auth.example.com/token',
        userInfoUrl: 'https://auth.example.com/userinfo',
        authorizationUrl: 'https://auth.example.com/authorize',
      };

      const tokens = await this.ssoService.exchangeOpenIDCode(config, code);
      const userInfo = await this.ssoService.getOpenIDUserInfo(config, tokens.access_token);

      return {
        success: true,
        data: {
          tokens,
          user: userInfo,
        },
        message: 'OpenID authentication successful',
      };
    } catch (error) {
      throw new BadRequestException('OpenID callback failed');
    }
  }

  /**
   * SAML assertion consumer service (ACS)
   */
  @Post('saml/acs')
  async samlAcs(
    @Body() body: { SAMLResponse: string; RelayState?: string },
  ) {
    if (!body.SAMLResponse) {
      throw new BadRequestException('Missing SAML response');
    }

    try {
      const config = {
        issuer: process.env.APP_NAME || 'StrellerMinds',
        redirectUrl: `${process.env.API_URL}/integrations/sso/saml/acs`,
        idpUrl: 'https://idp.example.com/sso',
      };

      // Verify signature
      const isValid = await this.ssoService.verifySAMLSignature(body.SAMLResponse, config);
      if (!isValid) {
        throw new BadRequestException('Invalid SAML signature');
      }

      // Parse response
      const userInfo = await this.ssoService.parseSAMLResponse(body.SAMLResponse, config);

      return {
        success: true,
        data: userInfo,
        message: 'SAML authentication successful',
      };
    } catch (error) {
      throw new BadRequestException('SAML authentication failed');
    }
  }

  /**
   * OAuth 2.0 authorization endpoint
   */
  @Get('oauth2/auth/:configId')
  async oauth2Auth(
    @Param('configId') configId: string,
  ) {
    const state = this.ssoService.generateState();
    const { codeVerifier, codeChallenge } = this.ssoService.generatePKCE();

    const config = {
      clientId: 'dummy',
      redirectUrl: `${process.env.API_URL}/integrations/sso/oauth2/callback`,
      authorizationUrl: 'https://auth.example.com/authorize',
      scopes: ['openid', 'profile', 'email'],
    };

    const authUrl = this.ssoService.generateOAuth2AuthUrl(config, state);

    return {
      success: true,
      data: { authUrl, state, codeVerifier, codeChallenge },
    };
  }

  /**
   * OAuth 2.0 callback endpoint
   */
  @Get('oauth2/callback')
  async oauth2Callback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    try {
      const config = {
        clientId: 'dummy',
        clientSecret: 'dummy',
        redirectUrl: `${process.env.API_URL}/integrations/sso/oauth2/callback`,
        tokenUrl: 'https://auth.example.com/token',
        authorizationUrl: 'https://auth.example.com/authorize',
      };

      const tokens = await this.ssoService.exchangeOAuth2Code(config, code);

      return {
        success: true,
        data: tokens,
        message: 'OAuth 2.0 authentication successful',
      };
    } catch (error) {
      throw new BadRequestException('OAuth 2.0 callback failed');
    }
  }
}
