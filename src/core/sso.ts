/**
 * SSO Integrations: SAML 2.0 and OAuth2/OIDC
 * Handles authentication flows, token management, and user federation
 */

import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationHealth,
  IntegrationStatus,
  generateId,
} from '../core/base';
import { HttpClient } from '../core/http-client';
import { globalEventBus } from './evemt.bus';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface SsoUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  groups?: string[];
  roles?: string[];
  attributes?: Record<string, string | string[]>;
  provider: 'saml' | 'oauth2';
  externalId: string;
}

export interface AuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  idToken?: string;
  scope?: string;
  expiresAt: Date;
}

// ─── SAML 2.0 Integration ─────────────────────────────────────────────────────

export interface SamlConfig extends IntegrationConfig {
  credentials: {
    entityId: string; // SP entity ID
    idpMetadataUrl?: string;
    idpSsoUrl: string;
    idpCertificate: string;
    spPrivateKey?: string;
    spCertificate?: string;
    callbackUrl: string;
  };
  settings: {
    nameIdFormat?: string;
    signRequests?: boolean;
    wantAssertionsSigned?: boolean;
    wantMessageSigned?: boolean;
    attributeMapping?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      groups?: string;
      userId?: string;
    };
    allowedClockSkewMs?: number;
  };
}

export interface SamlAuthRequest {
  id: string;
  issuer: string;
  destination: string;
  assertionConsumerServiceUrl: string;
  nameIdPolicy: string;
  timestamp: Date;
  relayState?: string;
}

export interface SamlAssertion {
  nameId: string;
  nameIdFormat: string;
  sessionIndex?: string;
  issuer: string;
  conditions: {
    notBefore: Date;
    notOnOrAfter: Date;
    audienceRestriction?: string[];
  };
  attributes: Record<string, string[]>;
  authnContext?: string;
}

export class SamlIntegration extends BaseIntegration {
  private samlConfig: SamlConfig;

  constructor(config: SamlConfig) {
    super(config);
    this.samlConfig = config;
  }

  async connect(): Promise<void> {
    // Validate IdP metadata is accessible if URL provided
    if (this.samlConfig.credentials.idpMetadataUrl) {
      const client = new HttpClient({
        baseUrl: this.samlConfig.credentials.idpMetadataUrl,
      });
      await client.get('');
    }

    await globalEventBus.publish(this.getId(), 'saml.connected', {
      entityId: this.samlConfig.credentials.entityId,
    });
  }

  async disconnect(): Promise<void> {
    await globalEventBus.publish(this.getId(), 'saml.disconnected', {});
  }

  async healthCheck(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      if (this.samlConfig.credentials.idpMetadataUrl) {
        const client = new HttpClient({
          baseUrl: this.samlConfig.credentials.idpMetadataUrl,
        });
        await client.get('');
      }

      return {
        integrationId: this.getId(),
        status: IntegrationStatus.CONNECTED,
        lastChecked: new Date(),
        latencyMs: Date.now() - start,
        metrics: this.getMetrics(),
      };
    } catch (err) {
      return {
        integrationId: this.getId(),
        status: IntegrationStatus.ERROR,
        lastChecked: new Date(),
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        metrics: this.getMetrics(),
      };
    }
  }

  /**
   * Generate a SAML AuthnRequest
   * In production this would use a SAML library like samlify or node-saml
   */
  generateAuthRequest(relayState?: string): { url: string; request: SamlAuthRequest } {
    const requestId = `_${generateId()}`;
    const timestamp = new Date();

    const request: SamlAuthRequest = {
      id: requestId,
      issuer: this.samlConfig.credentials.entityId,
      destination: this.samlConfig.credentials.idpSsoUrl,
      assertionConsumerServiceUrl: this.samlConfig.credentials.callbackUrl,
      nameIdPolicy:
        this.samlConfig.settings.nameIdFormat ??
        'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      timestamp,
      relayState,
    };

    // Build minimal AuthnRequest XML
    const xml = this.buildAuthnRequestXml(request);
    const encoded = Buffer.from(xml).toString('base64');

    const params = new URLSearchParams({
      SAMLRequest: encoded,
      ...(relayState ? { RelayState: relayState } : {}),
    });

    return {
      url: `${this.samlConfig.credentials.idpSsoUrl}?${params.toString()}`,
      request,
    };
  }

  private buildAuthnRequestXml(request: SamlAuthRequest): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${request.id}"
  Version="2.0"
  IssueInstant="${request.timestamp.toISOString()}"
  Destination="${request.destination}"
  AssertionConsumerServiceURL="${request.assertionConsumerServiceUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${request.issuer}</saml:Issuer>
  <samlp:NameIDPolicy
    Format="${request.nameIdPolicy}"
    AllowCreate="true"/>
</samlp:AuthnRequest>`;
  }

  /**
   * Parse and validate a SAML Response
   * Production implementation should verify signature using IdP certificate
   */
  async parseResponse(samlResponse: string): Promise<{ user: SsoUser; assertion: SamlAssertion }> {
    const xml = Buffer.from(samlResponse, 'base64').toString('utf-8');

    // Basic parsing - production should use xml-crypto for signature validation
    const assertion = this.parseAssertion(xml);
    const user = this.mapAssertionToUser(assertion);

    await globalEventBus.publish(this.getId(), 'saml.login', {
      userId: user.id,
      email: user.email,
    });

    return { user, assertion };
  }

  private parseAssertion(xml: string): SamlAssertion {
    // Simplified parsing - production uses proper XML parser + signature validation
    const nameIdMatch = xml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    const nameId = nameIdMatch?.[1] ?? '';
    const issuerMatch = xml.match(/<saml:Issuer>([^<]+)<\/saml:Issuer>/);
    const issuer = issuerMatch?.[1] ?? '';

    // Parse attributes
    const attributes: Record<string, string[]> = {};
    const attrRegex = /<saml:Attribute Name="([^"]+)"[^>]*>[\s\S]*?<\/saml:Attribute>/g;
    let match;
    while ((match = attrRegex.exec(xml)) !== null) {
      const attrName = match[1];
      const valueMatches = match[0].matchAll(
        /<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/g,
      );
      attributes[attrName] = [...valueMatches].map((m) => m[1]);
    }

    const now = new Date();
    return {
      nameId,
      nameIdFormat:
        this.samlConfig.settings.nameIdFormat ??
        'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      issuer,
      conditions: {
        notBefore: new Date(now.getTime() - 60000),
        notOnOrAfter: new Date(now.getTime() + 3600000),
      },
      attributes,
    };
  }

  private mapAssertionToUser(assertion: SamlAssertion): SsoUser {
    const mapping = this.samlConfig.settings.attributeMapping ?? {};
    const attrs = assertion.attributes;

    const getAttr = (key?: string, fallback = ''): string => {
      if (!key) return fallback;
      return attrs[key]?.[0] ?? fallback;
    };

    const email =
      getAttr(
        mapping.email,
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      ) || assertion.nameId;

    return {
      id: getAttr(mapping.userId) || assertion.nameId,
      email,
      firstName: getAttr(
        mapping.firstName,
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      ),
      lastName: getAttr(
        mapping.lastName,
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      ),
      displayName: `${getAttr(mapping.firstName)} ${getAttr(mapping.lastName)}`.trim() || email,
      groups: attrs[mapping.groups ?? 'groups'] ?? [],
      attributes: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, v.join(',')])),
      provider: 'saml',
      externalId: assertion.nameId,
    };
  }

  generateLogoutRequest(nameId: string, sessionIndex?: string): string {
    const requestId = `_${generateId()}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${new Date().toISOString()}">
  <saml:Issuer>${this.samlConfig.credentials.entityId}</saml:Issuer>
  <saml:NameID>${nameId}</saml:NameID>
  ${sessionIndex ? `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>` : ''}
</samlp:LogoutRequest>`;
  }

  getServiceProviderMetadata(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${this.samlConfig.credentials.entityId}">
  <md:SPSSODescriptor
    AuthnRequestsSigned="${this.samlConfig.settings.signRequests ?? false}"
    WantAssertionsSigned="${this.samlConfig.settings.wantAssertionsSigned ?? true}"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${this.samlConfig.credentials.callbackUrl}"
      index="0"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }
}

// ─── OAuth2 / OIDC Integration ────────────────────────────────────────────────

export type OAuth2Provider =
  | 'google'
  | 'microsoft'
  | 'github'
  | 'okta'
  | 'auth0'
  | 'keycloak'
  | 'custom';

export interface OAuth2Config extends IntegrationConfig {
  credentials: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  settings: {
    provider: OAuth2Provider;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl?: string;
    jwksUri?: string;
    issuer?: string;
    scopes: string[];
    pkce?: boolean;
    attributeMapping?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      userId?: string;
      groups?: string;
    };
  };
}

interface PkceChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export class OAuth2Integration extends BaseIntegration {
  private client: HttpClient;
  private oauth2Config: OAuth2Config;
  private tokenCache = new Map<string, AuthToken>();
  private stateStore = new Map<
    string,
    { timestamp: number; relayState?: string; pkce?: PkceChallenge }
  >();

  constructor(config: OAuth2Config) {
    super(config);
    this.oauth2Config = config;
    this.client = new HttpClient({
      baseUrl: '',
      timeout: 30000,
    });
  }

  async connect(): Promise<void> {
    // Validate the token endpoint is reachable
    const client = new HttpClient({ baseUrl: this.oauth2Config.settings.tokenUrl });
    try {
      await client.get('');
    } catch {
      // 405 Method Not Allowed is fine - endpoint exists
    }

    await globalEventBus.publish(this.getId(), 'oauth2.connected', {
      provider: this.oauth2Config.settings.provider,
    });
  }

  async disconnect(): Promise<void> {
    this.tokenCache.clear();
    await globalEventBus.publish(this.getId(), 'oauth2.disconnected', {});
  }

  async healthCheck(): Promise<IntegrationHealth> {
    return {
      integrationId: this.getId(),
      status: IntegrationStatus.CONNECTED,
      lastChecked: new Date(),
      metrics: this.getMetrics(),
    };
  }

  /**
   * Generate authorization URL for the OAuth2 flow
   */
  async getAuthorizationUrl(relayState?: string): Promise<{ url: string; state: string }> {
    const state = generateId();
    const pkce = this.oauth2Config.settings.pkce ? await this.generatePkce() : undefined;

    this.stateStore.set(state, {
      timestamp: Date.now(),
      relayState,
      pkce,
    });

    // Clean up expired states (> 10 minutes)
    for (const [key, val] of this.stateStore) {
      if (Date.now() - val.timestamp > 600000) this.stateStore.delete(key);
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.oauth2Config.credentials.clientId,
      redirect_uri: this.oauth2Config.credentials.redirectUri,
      scope: this.oauth2Config.settings.scopes.join(' '),
      state,
      ...(pkce
        ? {
            code_challenge: pkce.codeChallenge,
            code_challenge_method: pkce.codeChallengeMethod,
          }
        : {}),
    });

    return {
      url: `${this.oauth2Config.settings.authorizationUrl}?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, state: string): Promise<{ token: AuthToken; user: SsoUser }> {
    const stateData = this.stateStore.get(state);
    if (!stateData) {
      throw new Error('Invalid or expired OAuth2 state parameter');
    }
    this.stateStore.delete(state);

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.oauth2Config.credentials.redirectUri,
      client_id: this.oauth2Config.credentials.clientId,
      client_secret: this.oauth2Config.credentials.clientSecret,
      ...(stateData.pkce ? { code_verifier: stateData.pkce.codeVerifier } : {}),
    });

    const tokenClient = new HttpClient({
      baseUrl: this.oauth2Config.settings.tokenUrl,
    });

    const response = await tokenClient.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token?: string;
      id_token?: string;
      scope?: string;
    }>('', Object.fromEntries(params));

    const raw = response.data!;
    const token: AuthToken = {
      accessToken: raw.access_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      refreshToken: raw.refresh_token,
      idToken: raw.id_token,
      scope: raw.scope,
      expiresAt: new Date(Date.now() + raw.expires_in * 1000),
    };

    const user = await this.getUserInfo(token);
    this.tokenCache.set(user.id, token);

    await globalEventBus.publish(this.getId(), 'oauth2.login', {
      userId: user.id,
      email: user.email,
      provider: this.oauth2Config.settings.provider,
    });

    return { token, user };
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthToken> {
    const tokenClient = new HttpClient({
      baseUrl: this.oauth2Config.settings.tokenUrl,
    });

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.oauth2Config.credentials.clientId,
      client_secret: this.oauth2Config.credentials.clientSecret,
    });

    const response = await tokenClient.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token?: string;
    }>('', Object.fromEntries(params));

    const raw = response.data!;
    return {
      accessToken: raw.access_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      refreshToken: raw.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + raw.expires_in * 1000),
    };
  }

  /**
   * Get user info from the userinfo endpoint or decode the ID token
   */
  async getUserInfo(token: AuthToken): Promise<SsoUser> {
    const userInfoUrl = this.oauth2Config.settings.userInfoUrl;
    if (!userInfoUrl) {
      return this.parseIdToken(token.idToken ?? '');
    }

    const client = new HttpClient({
      baseUrl: userInfoUrl,
      auth: { type: 'bearer', token: token.accessToken },
    });

    const response = await client.get<Record<string, unknown>>('');
    return this.mapUserInfoToUser(response.data ?? {});
  }

  /**
   * Parse a JWT ID token (without verification - use a JWT library in production)
   */
  private parseIdToken(idToken: string): SsoUser {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid ID token format');

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as Record<
      string,
      unknown
    >;

    return this.mapUserInfoToUser(payload);
  }

  private mapUserInfoToUser(info: Record<string, unknown>): SsoUser {
    const mapping = this.oauth2Config.settings.attributeMapping ?? {};

    const get = (key: string, fallback = ''): string => String(info[key] ?? fallback);

    const email = get(mapping.email ?? 'email') || get('preferred_username') || get('upn');

    const userId = get(mapping.userId ?? 'sub') || get('oid') || get('id');

    const firstName = get(mapping.firstName ?? 'given_name') || get('first_name');

    const lastName = get(mapping.lastName ?? 'family_name') || get('last_name');

    const groups = (info[mapping.groups ?? 'groups'] as string[]) ?? [];

    return {
      id: userId,
      email,
      firstName,
      lastName,
      displayName: get('name') || `${firstName} ${lastName}`.trim() || email,
      groups,
      attributes: Object.fromEntries(Object.entries(info).map(([k, v]) => [k, String(v)])),
      provider: 'oauth2',
      externalId: userId,
    };
  }

  /**
   * Client credentials flow for service-to-service auth
   */
  async getClientCredentialsToken(scope?: string): Promise<AuthToken> {
    const tokenClient = new HttpClient({
      baseUrl: this.oauth2Config.settings.tokenUrl,
    });

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.oauth2Config.credentials.clientId,
      client_secret: this.oauth2Config.credentials.clientSecret,
      ...(scope ? { scope } : {}),
    });

    const response = await tokenClient.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>('', Object.fromEntries(params));

    const raw = response.data!;
    return {
      accessToken: raw.access_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      expiresAt: new Date(Date.now() + raw.expires_in * 1000),
    };
  }

  /**
   * Get or refresh a cached token for a user
   */
  async getValidToken(userId: string): Promise<AuthToken | null> {
    const cached = this.tokenCache.get(userId);
    if (!cached) return null;

    // Refresh if expiring within 5 minutes
    if (cached.expiresAt.getTime() - Date.now() < 300000) {
      if (!cached.refreshToken) return null;
      const refreshed = await this.refreshToken(cached.refreshToken);
      this.tokenCache.set(userId, refreshed);
      return refreshed;
    }

    return cached;
  }

  private async generatePkce(): Promise<PkceChallenge> {
    const codeVerifier = generateId() + generateId();

    // In Node.js - use crypto module in production
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeChallenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }
}

// ─── Pre-configured OAuth2 Providers ─────────────────────────────────────────

export const OAuth2Providers: Record<
  Exclude<OAuth2Provider, 'custom'>,
  Pick<
    OAuth2Config['settings'],
    'authorizationUrl' | 'tokenUrl' | 'userInfoUrl' | 'jwksUri' | 'issuer'
  >
> = {
  google: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    issuer: 'https://accounts.google.com',
  },
  microsoft: {
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
    issuer: 'https://login.microsoftonline.com',
  },
  github: {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
  },
  okta: {
    authorizationUrl: '', // Set from config: https://{domain}/oauth2/v1/authorize
    tokenUrl: '',
    userInfoUrl: '',
    jwksUri: '',
    issuer: '',
  },
  auth0: {
    authorizationUrl: '', // https://{domain}/authorize
    tokenUrl: '',
    userInfoUrl: '',
    jwksUri: '',
    issuer: '',
  },
  keycloak: {
    authorizationUrl: '', // https://{domain}/realms/{realm}/protocol/openid-connect/auth
    tokenUrl: '',
    userInfoUrl: '',
    jwksUri: '',
    issuer: '',
  },
};
