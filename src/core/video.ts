/**
 * Video Conferencing Integrations: Zoom and Microsoft Teams
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

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  joinUrl: string;
  hostUrl?: string;
  startTime: Date;
  durationMinutes: number;
  timezone?: string;
  password?: string;
  provider: 'zoom' | 'teams';
  hostEmail?: string;
  status: 'scheduled' | 'started' | 'ended';
  settings?: Record<string, unknown>;
}

export interface MeetingRecording {
  id: string;
  meetingId: string;
  startTime: Date;
  endTime?: Date;
  fileType: string;
  fileSize?: number;
  downloadUrl: string;
  playUrl?: string;
  password?: string;
  expiresAt?: Date;
}

export interface Participant {
  id?: string;
  name: string;
  email?: string;
  joinTime?: Date;
  leaveTime?: Date;
  duration?: number;
  attentiveness?: number;
}

// ─── Zoom Integration ─────────────────────────────────────────────────────────

export interface ZoomConfig extends IntegrationConfig {
  credentials: {
    accountId: string;
    clientId: string;
    clientSecret: string;
  };
}

export class ZoomIntegration extends BaseIntegration {
  private client: HttpClient;
  private token: AuthToken | null = null;
  private zoomConfig: ZoomConfig;

  constructor(config: ZoomConfig) {
    super(config);
    this.zoomConfig = config;
    this.client = new HttpClient({
      baseUrl: 'https://api.zoom.us/v2',
      timeout: 30000,
      rateLimitPerMinute: 100, // Zoom free tier rate limit
    });
  }

  private async ensureToken(): Promise<void> {
    if (this.token && this.token.expiresAt > new Date()) return;

    const tokenClient = new HttpClient({
      baseUrl: 'https://zoom.us/oauth/token',
      auth: {
        type: 'basic',
        username: this.zoomConfig.credentials.clientId,
        password: this.zoomConfig.credentials.clientSecret,
      },
    });

    const response = await tokenClient.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>('', {
      grant_type: 'account_credentials',
      account_id: this.zoomConfig.credentials.accountId,
    });

    const raw = response.data!;
    this.token = {
      accessToken: raw.access_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      expiresAt: new Date(Date.now() + raw.expires_in * 1000),
    };

    this.client.updateAuth({ type: 'bearer', token: this.token.accessToken });
  }

  async connect(): Promise<void> {
    await this.ensureToken();
    await globalEventBus.publish(this.getId(), 'zoom.connected', {
      accountId: this.zoomConfig.credentials.accountId,
    });
  }

  async disconnect(): Promise<void> {
    this.token = null;
    await globalEventBus.publish(this.getId(), 'zoom.disconnected', {});
  }

  async healthCheck(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      await this.ensureToken();
      await this.makeRequest(() => this.client.get('/users/me'));
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

  // ─── Meetings ──────────────────────────────────────────────────────────────

  async createMeeting(params: {
    topic: string;
    startTime: Date;
    durationMinutes: number;
    timezone?: string;
    password?: string;
    hostEmail?: string;
    settings?: {
      waitingRoom?: boolean;
      joinBeforeHost?: boolean;
      muteUponEntry?: boolean;
      autoRecording?: 'none' | 'local' | 'cloud';
      registrationType?: 1 | 2 | 3;
    };
  }): Promise<Meeting> {
    await this.ensureToken();

    const userId = params.hostEmail ?? 'me';
    const response = await this.makeRequest(() =>
      this.client.post<{
        id: number;
        join_url: string;
        start_url: string;
        password: string;
        status: string;
      }>(`/users/${userId}/meetings`, {
        topic: params.topic,
        type: 2, // Scheduled meeting
        start_time: params.startTime.toISOString(),
        duration: params.durationMinutes,
        timezone: params.timezone ?? 'UTC',
        password: params.password,
        settings: {
          waiting_room: params.settings?.waitingRoom ?? false,
          join_before_host: params.settings?.joinBeforeHost ?? false,
          mute_upon_entry: params.settings?.muteUponEntry ?? true,
          auto_recording: params.settings?.autoRecording ?? 'none',
          registration_type: params.settings?.registrationType,
        },
      }),
    );

    const raw = response.data!;
    const meeting: Meeting = {
      id: String(raw.id),
      title: params.topic,
      joinUrl: raw.join_url,
      hostUrl: raw.start_url,
      startTime: params.startTime,
      durationMinutes: params.durationMinutes,
      timezone: params.timezone,
      password: raw.password,
      provider: 'zoom',
      hostEmail: params.hostEmail,
      status: 'scheduled',
    };

    await globalEventBus.publish(this.getId(), 'zoom.meeting.created', { meeting });
    return meeting;
  }

  async getMeeting(meetingId: string): Promise<Meeting> {
    await this.ensureToken();

    const response = await this.makeRequest(() =>
      this.client.get<{
        id: number;
        topic: string;
        join_url: string;
        start_url: string;
        start_time: string;
        duration: number;
        timezone: string;
        password: string;
        status: string;
        host_email: string;
      }>(`/meetings/${meetingId}`),
    );

    const raw = response.data!;
    return {
      id: String(raw.id),
      title: raw.topic,
      joinUrl: raw.join_url,
      hostUrl: raw.start_url,
      startTime: new Date(raw.start_time),
      durationMinutes: raw.duration,
      timezone: raw.timezone,
      password: raw.password,
      provider: 'zoom',
      hostEmail: raw.host_email,
      status: raw.status === 'started' ? 'started' : 'scheduled',
    };
  }

  async updateMeeting(
    meetingId: string,
    updates: Partial<{
      topic: string;
      startTime: Date;
      durationMinutes: number;
      password: string;
    }>,
  ): Promise<void> {
    await this.ensureToken();
    await this.makeRequest(() =>
      this.client.patch(`/meetings/${meetingId}`, {
        topic: updates.topic,
        start_time: updates.startTime?.toISOString(),
        duration: updates.durationMinutes,
        password: updates.password,
      }),
    );
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    await this.ensureToken();
    await this.makeRequest(() => this.client.delete(`/meetings/${meetingId}`));
    await globalEventBus.publish(this.getId(), 'zoom.meeting.deleted', { meetingId });
  }

  async listMeetings(
    userId = 'me',
    type: 'scheduled' | 'live' | 'upcoming' = 'upcoming',
  ): Promise<Meeting[]> {
    await this.ensureToken();

    const response = await this.makeRequest(() =>
      this.client.get<{
        meetings: Array<{
          id: number;
          topic: string;
          join_url: string;
          start_time: string;
          duration: number;
        }>;
      }>(`/users/${userId}/meetings`, { type }),
    );

    return (response.data?.meetings ?? []).map((m) => ({
      id: String(m.id),
      title: m.topic,
      joinUrl: m.join_url,
      startTime: new Date(m.start_time),
      durationMinutes: m.duration,
      provider: 'zoom' as const,
      status: 'scheduled' as const,
    }));
  }

  // ─── Participants & Recordings ─────────────────────────────────────────────

  async getMeetingParticipants(meetingId: string): Promise<Participant[]> {
    await this.ensureToken();

    const response = await this.makeRequest(() =>
      this.client.get<{
        participants: Array<{
          id: string;
          name: string;
          user_email: string;
          join_time: string;
          leave_time?: string;
          duration: number;
          attentiveness_score?: string;
        }>;
      }>(`/past_meetings/${meetingId}/participants`),
    );

    return (response.data?.participants ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.user_email,
      joinTime: new Date(p.join_time),
      leaveTime: p.leave_time ? new Date(p.leave_time) : undefined,
      duration: p.duration,
      attentiveness: p.attentiveness_score ? parseFloat(p.attentiveness_score) : undefined,
    }));
  }

  async getRecordings(meetingId: string): Promise<MeetingRecording[]> {
    await this.ensureToken();

    const response = await this.makeRequest(() =>
      this.client.get<{
        recording_files: Array<{
          id: string;
          file_type: string;
          file_size: number;
          download_url: string;
          play_url: string;
          recording_start: string;
          recording_end?: string;
          status: string;
        }>;
        password?: string;
      }>(`/meetings/${meetingId}/recordings`),
    );

    return (response.data?.recording_files ?? []).map((r) => ({
      id: r.id,
      meetingId,
      startTime: new Date(r.recording_start),
      endTime: r.recording_end ? new Date(r.recording_end) : undefined,
      fileType: r.file_type,
      fileSize: r.file_size,
      downloadUrl: r.download_url,
      playUrl: r.play_url,
      password: response.data?.password,
    }));
  }

  // ─── Webinars ─────────────────────────────────────────────────────────────

  async createWebinar(params: {
    topic: string;
    startTime: Date;
    durationMinutes: number;
    agenda?: string;
    hostEmail?: string;
  }): Promise<Meeting & { registrationUrl?: string }> {
    await this.ensureToken();

    const userId = params.hostEmail ?? 'me';
    const response = await this.makeRequest(() =>
      this.client.post<{
        id: number;
        join_url: string;
        start_url: string;
        registration_url: string;
      }>(`/users/${userId}/webinars`, {
        topic: params.topic,
        type: 5, // Webinar
        start_time: params.startTime.toISOString(),
        duration: params.durationMinutes,
        agenda: params.agenda,
      }),
    );

    const raw = response.data!;
    return {
      id: String(raw.id),
      title: params.topic,
      joinUrl: raw.join_url,
      hostUrl: raw.start_url,
      startTime: params.startTime,
      durationMinutes: params.durationMinutes,
      provider: 'zoom',
      status: 'scheduled',
      registrationUrl: raw.registration_url,
    };
  }
}

// ─── Microsoft Teams Integration ─────────────────────────────────────────────

export interface TeamsConfig extends IntegrationConfig {
  credentials: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
  };
}

export class TeamsIntegration extends BaseIntegration {
  private graphClient: HttpClient;
  private teamsConfig: TeamsConfig;
  private token: AuthToken | null = null;

  constructor(config: TeamsConfig) {
    super(config);
    this.teamsConfig = config;
    this.graphClient = new HttpClient({
      baseUrl: 'https://graph.microsoft.com/v1.0',
      timeout: 30000,
      rateLimitPerMinute: 120,
    });
  }

  private async ensureToken(): Promise<void> {
    if (this.token && this.token.expiresAt > new Date()) return;

    const tokenUrl = `https://login.microsoftonline.com/${this.teamsConfig.credentials.tenantId}/oauth2/v2.0/token`;
    const tokenClient = new HttpClient({ baseUrl: tokenUrl });

    const response = await tokenClient.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>('', {
      grant_type: 'client_credentials',
      client_id: this.teamsConfig.credentials.clientId,
      client_secret: this.teamsConfig.credentials.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const raw = response.data!;
    this.token = {
      accessToken: raw.access_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      expiresAt: new Date(Date.now() + raw.expires_in * 1000),
    };

    this.graphClient.updateAuth({
      type: 'bearer',
      token: this.token.accessToken,
    });
  }

  async connect(): Promise<void> {
    await this.ensureToken();
    await globalEventBus.publish(this.getId(), 'teams.connected', {
      tenantId: this.teamsConfig.credentials.tenantId,
    });
  }

  async disconnect(): Promise<void> {
    this.token = null;
    await globalEventBus.publish(this.getId(), 'teams.disconnected', {});
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

  // ─── Online Meetings ───────────────────────────────────────────────────────

  async createMeeting(params: {
    subject: string;
    startTime: Date;
    endTime: Date;
    organizerEmail: string;
    attendees?: string[];
    isRecordingEnabled?: boolean;
  }): Promise<Meeting> {
    await this.ensureToken();

    const response = await this.makeRequest(() =>
      this.graphClient.post<{
        id: string;
        joinWebUrl: string;
        joinMeetingIdSettings?: { joinMeetingId: string };
        videoTeleconferenceId?: string;
        subject: string;
        startDateTime: string;
        endDateTime: string;
      }>(`/users/${params.organizerEmail}/onlineMeetings`, {
        subject: params.subject,
        startDateTime: params.startTime.toISOString(),
        endDateTime: params.endTime.toISOString(),
        isEntryExitAnnounced: false,
        recordAutomatically: params.isRecordingEnabled ?? false,
        participants: {
          organizer: {
            upn: params.organizerEmail,
            role: 'presenter',
          },
          attendees: (params.attendees ?? []).map((email) => ({
            upn: email,
            role: 'attendee',
          })),
        },
      }),
    );

    const raw = response.data!;
    const durationMs = params.endTime.getTime() - params.startTime.getTime();
    const meeting: Meeting = {
      id: raw.id,
      title: params.subject,
      joinUrl: raw.joinWebUrl,
      startTime: params.startTime,
      durationMinutes: Math.round(durationMs / 60000),
      provider: 'teams',
      hostEmail: params.organizerEmail,
      status: 'scheduled',
    };

    await globalEventBus.publish(this.getId(), 'teams.meeting.created', { meeting });
    return meeting;
  }

  async getMeeting(organizerEmail: string, meetingId: string): Promise<Meeting> {
    await this.ensureToken();

    const response = await this.makeRequest(() =>
      this.graphClient.get<{
        id: string;
        subject: string;
        joinWebUrl: string;
        startDateTime: string;
        endDateTime: string;
      }>(`/users/${organizerEmail}/onlineMeetings/${meetingId}`),
    );

    const raw = response.data!;
    const startTime = new Date(raw.startDateTime);
    const endTime = new Date(raw.endDateTime);

    return {
      id: raw.id,
      title: raw.subject,
      joinUrl: raw.joinWebUrl,
      startTime,
      durationMinutes: Math.round((endTime.getTime() - startTime.getTime()) / 60000),
      provider: 'teams',
      status: 'scheduled',
    };
  }

  async updateMeeting(
    organizerEmail: string,
    meetingId: string,
    updates: Partial<{ subject: string; startDateTime: Date; endDateTime: Date }>,
  ): Promise<void> {
    await this.ensureToken();
    await this.makeRequest(() =>
      this.graphClient.patch(`/users/${organizerEmail}/onlineMeetings/${meetingId}`, {
        subject: updates.subject,
        startDateTime: updates.startDateTime?.toISOString(),
        endDateTime: updates.endDateTime?.toISOString(),
      }),
    );
  }

  async cancelMeeting(organizerEmail: string, meetingId: string): Promise<void> {
    await this.ensureToken();
    await this.makeRequest(() =>
      this.graphClient.delete(`/users/${organizerEmail}/onlineMeetings/${meetingId}`),
    );
    await globalEventBus.publish(this.getId(), 'teams.meeting.cancelled', { meetingId });
  }

  // ─── Recordings ───────────────────────────────────────────────────────────

  async getMeetingRecordings(meetingId: string): Promise<MeetingRecording[]> {
    await this.ensureToken();

    const response = await this.makeRequest(() =>
      this.graphClient.get<{
        value: Array<{
          id: string;
          content: { downloadUrl: string };
          createdDateTime: string;
          endDateTime?: string;
          contentCorrelationId?: string;
        }>;
      }>(`/me/onlineMeetings/${meetingId}/recordings`),
    );

    return (response.data?.value ?? []).map((r) => ({
      id: r.id,
      meetingId,
      startTime: new Date(r.createdDateTime),
      endTime: r.endDateTime ? new Date(r.endDateTime) : undefined,
      fileType: 'mp4',
      downloadUrl: r.content.downloadUrl,
      provider: 'teams',
    }));
  }

  // ─── Teams Channels ───────────────────────────────────────────────────────

  async listTeams(): Promise<Array<{ id: string; displayName: string; description: string }>> {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.graphClient.get<{
        value: Array<{ id: string; displayName: string; description: string }>;
      }>("/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')"),
    );
    return response.data?.value ?? [];
  }

  async sendChannelMessage(teamId: string, channelId: string, message: string): Promise<void> {
    await this.ensureToken();
    await this.makeRequest(() =>
      this.graphClient.post(`/teams/${teamId}/channels/${channelId}/messages`, {
        body: { content: message, contentType: 'text' },
      }),
    );
  }

  async createChannel(
    teamId: string,
    name: string,
    description?: string,
  ): Promise<{ id: string; displayName: string }> {
    await this.ensureToken();
    const response = await this.makeRequest(() =>
      this.graphClient.post<{ id: string; displayName: string }>(`/teams/${teamId}/channels`, {
        displayName: name,
        description,
        membershipType: 'standard',
      }),
    );
    return response.data!;
  }
}
