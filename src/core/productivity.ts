/**
 * Productivity Tool Integrations
 * Google Workspace (Drive, Gmail, Calendar, Classroom) and Microsoft 365 (SharePoint, Exchange, OneDrive)
 */

import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationHealth,
  IntegrationStatus,
} from '../core/base';
import { HttpClient } from '../core/http-client';
import { globalEventBus } from './evemt.bus';
import { AuthToken } from './sso';

// ─── Google Workspace Integration ─────────────────────────────────────────────

export interface GoogleWorkspaceConfig extends IntegrationConfig {
  credentials: {
    clientId: string;
    clientSecret: string;
    refreshToken: string; // Service account or user refresh token
    serviceAccountEmail?: string;
  };
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
  shared?: boolean;
  owners?: Array<{ emailAddress: string; displayName: string }>;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string } | { date: string };
  end: { dateTime: string; timeZone?: string } | { date: string };
  attendees?: Array<{ email: string; responseStatus?: string }>;
  conferenceData?: {
    createRequest?: { requestId: string; conferenceSolutionKey: { type: string } };
    entryPoints?: Array<{ entryPointType: string; uri: string; label?: string }>;
  };
  recurrence?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload?: {
    headers: Array<{ name: string; value: string }>;
    body?: { data: string };
    parts?: Array<{ mimeType: string; body: { data: string }; filename?: string }>;
  };
  internalDate: string;
}

export class GoogleWorkspaceIntegration extends BaseIntegration {
  private driveClient!: HttpClient;
  private calendarClient!: HttpClient;
  private gmailClient!: HttpClient;
  private classroomClient!: HttpClient;
  private token: AuthToken | null = null;
  private wsConfig: GoogleWorkspaceConfig;

  constructor(config: GoogleWorkspaceConfig) {
    super(config);
    this.wsConfig = config;
  }

  private async ensureToken(): Promise<void> {
    if (this.token && this.token.expiresAt > new Date()) return;

    const tokenClient = new HttpClient({
      baseUrl: 'https://oauth2.googleapis.com/token',
    });

    const response = await tokenClient.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>('', {
      client_id: this.wsConfig.credentials.clientId,
      client_secret: this.wsConfig.credentials.clientSecret,
      refresh_token: this.wsConfig.credentials.refreshToken,
      grant_type: 'refresh_token',
    });

    const raw = response.data!;
    this.token = {
      accessToken: raw.access_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      expiresAt: new Date(Date.now() + raw.expires_in * 1000),
    };

    const auth = { type: 'bearer' as const, token: this.token.accessToken };
    this.driveClient = new HttpClient({
      baseUrl: 'https://www.googleapis.com/drive/v3',
      auth,
      rateLimitPerMinute: 100,
    });
    this.calendarClient = new HttpClient({
      baseUrl: 'https://www.googleapis.com/calendar/v3',
      auth,
      rateLimitPerMinute: 100,
    });
    this.gmailClient = new HttpClient({
      baseUrl: 'https://www.googleapis.com/gmail/v1',
      auth,
      rateLimitPerMinute: 250,
    });
    this.classroomClient = new HttpClient({
      baseUrl: 'https://classroom.googleapis.com/v1',
      auth,
      rateLimitPerMinute: 100,
    });
  }

  async connect(): Promise<void> {
    await this.ensureToken();
    await globalEventBus.publish(this.getId(), 'google_workspace.connected', {});
  }

  async disconnect(): Promise<void> {
    this.token = null;
    await globalEventBus.publish(this.getId(), 'google_workspace.disconnected', {});
  }

  async healthCheck(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      await this.ensureToken();
      await this.makeRequest(() => this.driveClient.get('/about', { fields: 'user' }));
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

  // ─── Google Drive ──────────────────────────────────────────────────────────

  async listFiles(params?: {
    folderId?: string;
    mimeType?: string;
    query?: string;
    pageSize?: number;
  }): Promise<GoogleDriveFile[]> {
    await this.ensureToken();

    const q: string[] = [];
    if (params?.folderId) q.push(`'${params.folderId}' in parents`);
    if (params?.mimeType) q.push(`mimeType='${params.mimeType}'`);
    if (params?.query) q.push(params.query);
    q.push('trashed=false');

    const response = await this.makeRequest(() =>
      this.driveClient.get<{ files: GoogleDriveFile[] }>('/files', {
        q: q.join(' and '),
        fields:
          'files(id,name,mimeType,size,webViewLink,webContentLink,parents,createdTime,modifiedTime,shared)',
        pageSize: String(params?.pageSize ?? 100),
      }),
    );

    return response.data?.files ?? [];
  }

  async uploadFile(
    name: string,
    content: string | Buffer,
    mimeType: string,
    folderId?: string,
  ): Promise<GoogleDriveFile> {
    await this.ensureToken();

    // Use multipart upload
    const boundary = '-------boundary';
    const metadata = JSON.stringify({ name, parents: folderId ? [folderId] : undefined });
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      `Content-Type: ${mimeType}`,
      '',
      typeof content === 'string' ? content : content.toString('utf-8'),
      `--${boundary}--`,
    ].join('\r\n');

    const uploadClient = new HttpClient({
      baseUrl: 'https://www.googleapis.com/upload/drive/v3',
      auth: { type: 'bearer', token: this.token!.accessToken },
    });

    const response = await this.makeRequest(() =>
      uploadClient.post<GoogleDriveFile>('/files?uploadType=multipart', body),
    );

    await globalEventBus.publish(this.getId(), 'google_drive.file.uploaded', {
      fileId: response.data?.id,
      name,
    });

    return response.data!;
  }

  async createFolder(name: string, parentId?: string): Promise<GoogleDriveFile> {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.driveClient.post<GoogleDriveFile>('/files', {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      }),
    );
    return response.data!;
  }

  async shareFile(
    fileId: string,
    email: string,
    role: 'reader' | 'writer' | 'commenter' = 'reader',
  ): Promise<void> {
    await this.ensureToken();
    await this.makeRequest(() =>
      this.driveClient.post(`/files/${fileId}/permissions`, {
        type: 'user',
        role,
        emailAddress: email,
      }),
    );
    await globalEventBus.publish(this.getId(), 'google_drive.file.shared', {
      fileId,
      email,
      role,
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.ensureToken();
    await this.makeRequest(() => this.driveClient.delete(`/files/${fileId}`));
  }

  // ─── Google Calendar ───────────────────────────────────────────────────────

  async listEvents(params: {
    calendarId?: string;
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
  }): Promise<GoogleCalendarEvent[]> {
    await this.ensureToken();
    const calendarId = params.calendarId ?? 'primary';

    const queryParams: Record<string, string> = {
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(params.maxResults ?? 50),
    };
    if (params.timeMin) queryParams['timeMin'] = params.timeMin.toISOString();
    if (params.timeMax) queryParams['timeMax'] = params.timeMax.toISOString();

    const response = await this.makeRequest(() =>
      this.calendarClient.get<{ items: GoogleCalendarEvent[] }>(
        `/calendars/${calendarId}/events`,
        queryParams,
      ),
    );

    return response.data?.items ?? [];
  }

  async createEvent(
    event: GoogleCalendarEvent,
    calendarId = 'primary',
    addMeet = false,
  ): Promise<GoogleCalendarEvent> {
    await this.ensureToken();

    const body = { ...event };
    if (addMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: String(Date.now()),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const response = await this.makeRequest(() =>
      this.calendarClient.post<GoogleCalendarEvent>(
        `/calendars/${calendarId}/events${addMeet ? '?conferenceDataVersion=1' : ''}`,
        body,
      ),
    );

    await globalEventBus.publish(this.getId(), 'google_calendar.event.created', {
      eventId: response.data?.id,
    });

    return response.data!;
  }

  async updateEvent(
    eventId: string,
    updates: Partial<GoogleCalendarEvent>,
    calendarId = 'primary',
  ): Promise<GoogleCalendarEvent> {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.calendarClient.patch<GoogleCalendarEvent>(
        `/calendars/${calendarId}/events/${eventId}`,
        updates,
      ),
    );
    return response.data!;
  }

  async deleteEvent(eventId: string, calendarId = 'primary'): Promise<void> {
    await this.ensureToken();
    await this.makeRequest(() =>
      this.calendarClient.delete(`/calendars/${calendarId}/events/${eventId}`),
    );
  }

  // ─── Gmail ─────────────────────────────────────────────────────────────────

  async sendEmail(params: {
    to: string | string[];
    subject: string;
    body: string;
    htmlBody?: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
  }): Promise<GmailMessage> {
    await this.ensureToken();

    const to = Array.isArray(params.to) ? params.to.join(', ') : params.to;
    const headers = [
      `To: ${to}`,
      `Subject: ${params.subject}`,
      params.cc ? `Cc: ${params.cc.join(', ')}` : '',
      params.bcc ? `Bcc: ${params.bcc.join(', ')}` : '',
      params.replyTo ? `Reply-To: ${params.replyTo}` : '',
    ]
      .filter(Boolean)
      .join('\r\n');

    const mimeType = params.htmlBody ? 'text/html' : 'text/plain';
    const content = params.htmlBody ?? params.body;
    const raw = `${headers}\r\nMIME-Version: 1.0\r\nContent-Type: ${mimeType}; charset=utf-8\r\n\r\n${content}`;
    const encoded = Buffer.from(raw).toString('base64url');

    const response = await this.makeRequest(() =>
      this.gmailClient.post<GmailMessage>('/users/me/messages/send', { raw: encoded }),
    );

    await globalEventBus.publish(this.getId(), 'gmail.message.sent', {
      messageId: response.data?.id,
      to,
    });

    return response.data!;
  }

  async listMessages(params?: {
    query?: string;
    maxResults?: number;
    labelIds?: string[];
  }): Promise<GmailMessage[]> {
    await this.ensureToken();

    const queryParams: Record<string, string> = {
      maxResults: String(params?.maxResults ?? 20),
    };
    if (params?.query) queryParams['q'] = params.query;
    if (params?.labelIds) queryParams['labelIds'] = params.labelIds.join(',');

    const listResponse = await this.makeRequest(() =>
      this.gmailClient.get<{ messages: Array<{ id: string }> }>('/users/me/messages', queryParams),
    );

    const ids = listResponse.data?.messages ?? [];
    const messages = await Promise.all(
      ids.map(({ id }) =>
        this.makeRequest(() => this.gmailClient.get<GmailMessage>(`/users/me/messages/${id}`)).then(
          (r) => r.data!,
        ),
      ),
    );

    return messages;
  }

  // ─── Google Classroom ──────────────────────────────────────────────────────

  async listClassroomCourses(): Promise<
    Array<{ id: string; name: string; section?: string; enrollmentCode?: string }>
  > {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.classroomClient.get<{
        courses: Array<{ id: string; name: string; section?: string; enrollmentCode?: string }>;
      }>('/courses', { courseStates: 'ACTIVE' }),
    );
    return response.data?.courses ?? [];
  }

  async createClassroomCourse(params: {
    name: string;
    section?: string;
    description?: string;
    room?: string;
    ownerId: string;
  }): Promise<{ id: string; name: string; alternateLink: string; enrollmentCode: string }> {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.classroomClient.post<{
        id: string;
        name: string;
        alternateLink: string;
        enrollmentCode: string;
      }>('/courses', params),
    );
    return response.data!;
  }
}

// ─── Microsoft 365 Integration ────────────────────────────────────────────────

export interface Microsoft365Config extends IntegrationConfig {
  credentials: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
  };
}

export interface SharePointFile {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
}

export interface OutlookEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  from: { emailAddress: { address: string; name: string } };
  toRecipients: Array<{ emailAddress: { address: string; name: string } }>;
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export class Microsoft365Integration extends BaseIntegration {
  private graphClient!: HttpClient;
  private m365Config: Microsoft365Config;
  private token: AuthToken | null = null;

  constructor(config: Microsoft365Config) {
    super(config);
    this.m365Config = config;
  }

  private async ensureToken(): Promise<void> {
    if (this.token && this.token.expiresAt > new Date()) return;

    const tokenUrl = `https://login.microsoftonline.com/${this.m365Config.credentials.tenantId}/oauth2/v2.0/token`;
    const tokenClient = new HttpClient({ baseUrl: tokenUrl });

    const response = await tokenClient.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>('', {
      grant_type: 'client_credentials',
      client_id: this.m365Config.credentials.clientId,
      client_secret: this.m365Config.credentials.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const raw = response.data!;
    this.token = {
      accessToken: raw.access_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      expiresAt: new Date(Date.now() + raw.expires_in * 1000),
    };

    this.graphClient = new HttpClient({
      baseUrl: 'https://graph.microsoft.com/v1.0',
      auth: { type: 'bearer', token: this.token.accessToken },
      rateLimitPerMinute: 120,
    });
  }

  async connect(): Promise<void> {
    await this.ensureToken();
    await globalEventBus.publish(this.getId(), 'microsoft365.connected', {
      tenantId: this.m365Config.credentials.tenantId,
    });
  }

  async disconnect(): Promise<void> {
    this.token = null;
    await globalEventBus.publish(this.getId(), 'microsoft365.disconnected', {});
  }

  async healthCheck(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      await this.ensureToken();
      await this.makeRequest(() => this.graphClient.get('/organization'));
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

  // ─── OneDrive / SharePoint ─────────────────────────────────────────────────

  async listOneDriveFiles(userId: string, folderId?: string): Promise<SharePointFile[]> {
    await this.ensureToken();
    const path = folderId
      ? `/users/${userId}/drive/items/${folderId}/children`
      : `/users/${userId}/drive/root/children`;

    const response = await this.makeRequest(() =>
      this.graphClient.get<{ value: SharePointFile[] }>(path),
    );
    return response.data?.value ?? [];
  }

  async uploadToOneDrive(
    userId: string,
    fileName: string,
    content: Buffer | string,
    folderId?: string,
  ): Promise<SharePointFile> {
    await this.ensureToken();

    const path = folderId
      ? `/users/${userId}/drive/items/${folderId}:/${fileName}:/content`
      : `/users/${userId}/drive/root:/${fileName}:/content`;

    const uploadClient = new HttpClient({
      baseUrl: 'https://graph.microsoft.com/v1.0',
      auth: { type: 'bearer', token: this.token!.accessToken },
    });

    const response = await this.makeRequest(() => uploadClient.put<SharePointFile>(path, content));

    await globalEventBus.publish(this.getId(), 'onedrive.file.uploaded', {
      fileId: response.data?.id,
      fileName,
    });

    return response.data!;
  }

  async shareOneDriveFile(
    userId: string,
    fileId: string,
    emails: string[],
    role: 'read' | 'write' = 'read',
  ): Promise<void> {
    await this.ensureToken();
    await this.makeRequest(() =>
      this.graphClient.post(`/users/${userId}/drive/items/${fileId}/invite`, {
        requireSignIn: true,
        sendInvitation: true,
        roles: [role],
        recipients: emails.map((email) => ({ email })),
      }),
    );
  }

  async listSharePointSites(): Promise<Array<{ id: string; displayName: string; webUrl: string }>> {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.graphClient.get<{ value: Array<{ id: string; displayName: string; webUrl: string }> }>(
        '/sites?search=*',
      ),
    );
    return response.data?.value ?? [];
  }

  async listSharePointFiles(
    siteId: string,
    driveId: string,
    itemId = 'root',
  ): Promise<SharePointFile[]> {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.graphClient.get<{ value: SharePointFile[] }>(
        `/sites/${siteId}/drives/${driveId}/items/${itemId}/children`,
      ),
    );
    return response.data?.value ?? [];
  }

  // ─── Outlook / Exchange ────────────────────────────────────────────────────

  async listEmails(
    userId: string,
    params?: { filter?: string; top?: number; skip?: number },
  ): Promise<OutlookEmail[]> {
    await this.ensureToken();

    const queryParams: Record<string, string> = {
      $top: String(params?.top ?? 20),
      $orderby: 'receivedDateTime desc',
    };
    if (params?.filter) queryParams['$filter'] = params.filter;
    if (params?.skip) queryParams['$skip'] = String(params.skip);

    const response = await this.makeRequest(() =>
      this.graphClient.get<{ value: OutlookEmail[] }>(`/users/${userId}/messages`, queryParams),
    );
    return response.data?.value ?? [];
  }

  async sendEmail(params: {
    fromUserId: string;
    to: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    cc?: string[];
    attachments?: Array<{ name: string; contentType: string; contentBytes: string }>;
  }): Promise<void> {
    await this.ensureToken();

    await this.makeRequest(() =>
      this.graphClient.post(`/users/${params.fromUserId}/sendMail`, {
        message: {
          subject: params.subject,
          body: {
            contentType: params.isHtml ? 'HTML' : 'Text',
            content: params.body,
          },
          toRecipients: params.to.map((email) => ({
            emailAddress: { address: email },
          })),
          ccRecipients: (params.cc ?? []).map((email) => ({
            emailAddress: { address: email },
          })),
          attachments: params.attachments?.map((a) => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: a.name,
            contentType: a.contentType,
            contentBytes: a.contentBytes,
          })),
        },
        saveToSentItems: true,
      }),
    );

    await globalEventBus.publish(this.getId(), 'outlook.email.sent', {
      from: params.fromUserId,
      to: params.to,
    });
  }

  // ─── Calendar (Exchange) ───────────────────────────────────────────────────

  async listCalendarEvents(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<
    Array<{
      id: string;
      subject: string;
      start: { dateTime: string };
      end: { dateTime: string };
      webLink: string;
      isOnlineMeeting: boolean;
      onlineMeetingUrl?: string;
    }>
  > {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.graphClient.get<{
        value: Array<{
          id: string;
          subject: string;
          start: { dateTime: string };
          end: { dateTime: string };
          webLink: string;
          isOnlineMeeting: boolean;
          onlineMeetingUrl?: string;
        }>;
      }>(`/users/${userId}/calendarView`, {
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        $select: 'id,subject,start,end,webLink,isOnlineMeeting,onlineMeetingUrl',
      }),
    );
    return response.data?.value ?? [];
  }

  async createCalendarEvent(
    userId: string,
    event: {
      subject: string;
      body?: string;
      start: Date;
      end: Date;
      attendees?: string[];
      isOnlineMeeting?: boolean;
      location?: string;
    },
  ): Promise<{ id: string; webLink: string; onlineMeetingUrl?: string }> {
    await this.ensureToken();

    const response = await this.makeRequest(() =>
      this.graphClient.post<{ id: string; webLink: string; onlineMeetingUrl?: string }>(
        `/users/${userId}/events`,
        {
          subject: event.subject,
          body: event.body ? { contentType: 'HTML', content: event.body } : undefined,
          start: { dateTime: event.start.toISOString(), timeZone: 'UTC' },
          end: { dateTime: event.end.toISOString(), timeZone: 'UTC' },
          location: event.location ? { displayName: event.location } : undefined,
          attendees: (event.attendees ?? []).map((email) => ({
            emailAddress: { address: email },
            type: 'required',
          })),
          isOnlineMeeting: event.isOnlineMeeting ?? false,
          onlineMeetingProvider: event.isOnlineMeeting ? 'teamsForBusiness' : undefined,
        },
      ),
    );

    await globalEventBus.publish(this.getId(), 'outlook.calendar.event.created', {
      eventId: response.data?.id,
    });

    return response.data!;
  }

  // ─── Microsoft Teams (via Graph) ───────────────────────────────────────────

  async getUserTeams(
    userId: string,
  ): Promise<Array<{ id: string; displayName: string; description: string }>> {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.graphClient.get<{
        value: Array<{ id: string; displayName: string; description: string }>;
      }>(`/users/${userId}/joinedTeams`),
    );
    return response.data?.value ?? [];
  }
}
