export const INTEGRATION_CONSTANTS = {
  LTI: {
    VERSION: '1.3',
    SCOPE: [
      'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
      'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
      'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
      'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
    ],
    REQUIRED_CLAIMS: ['iss', 'sub', 'aud', 'exp', 'iat', 'nonce'],
    TOKEN_EXPIRY: 3600, // 1 hour
  },
  ZOOM: {
    API_VERSION: 'v2',
    TOKEN_EXPIRY: 3600, // 1 hour
    MEETING_TYPES: {
      INSTANT: 1,
      SCHEDULED: 2,
      RECURRING: 3,
      FIXED_RECURRING: 8,
    },
    WEBHOOK_EVENTS: ['meeting.started', 'meeting.ended', 'recording.completed', 'user.updated'],
  },
  GOOGLE: {
    SCOPES: [
      'https://www.googleapis.com/auth/classroom.courses',
      'https://www.googleapis.com/auth/classroom.coursework.me',
      'https://www.googleapis.com/auth/classroom.coursework.students',
      'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
      'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
      'https://www.googleapis.com/auth/classroom.announcements',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
    TOKEN_EXPIRY: 3600,
  },
  MICROSOFT: {
    SCOPES: [
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/Calendars.ReadWrite.Shared',
      'https://graph.microsoft.com/Directory.Read.All',
      'https://graph.microsoft.com/Group.ReadWrite.All',
      'https://graph.microsoft.com/User.Read.All',
      'https://graph.microsoft.com/Mail.ReadWrite',
    ],
    TOKEN_EXPIRY: 3600,
  },
  SSO: {
    PROVIDERS: ['openid', 'saml', 'oauth2', 'ldap'],
    OPENID_SCOPE: ['openid', 'profile', 'email'],
    SAML_BINDING: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
    SESSION_TIMEOUT: 86400, // 24 hours
  },
  SYNC: {
    BATCH_SIZE: 100,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000, // 5 seconds
    SYNC_INTERVAL: 3600000, // 1 hour
    RESOURCE_TYPES: [
      'course',
      'assignment',
      'user',
      'submission',
      'grade',
      'meeting',
      'announcement',
    ],
  },
};

export const ERROR_MESSAGES = {
  INTEGRATION_NOT_FOUND: 'Integration configuration not found',
  INVALID_CREDENTIALS: 'Invalid or expired credentials',
  SYNC_IN_PROGRESS: 'Sync already in progress',
  UNAUTHORIZED: 'Unauthorized access',
  EXTERNAL_API_ERROR: 'External API error',
  INVALID_PAYLOAD: 'Invalid payload',
  RESOURCE_NOT_FOUND: 'Resource not found',
  MAPPING_NOT_FOUND: 'Integration mapping not found',
};
