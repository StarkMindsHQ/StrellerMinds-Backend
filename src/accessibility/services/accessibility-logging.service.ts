import type {
  AccessibilityEventType,
  SeverityLevel,
  WcagLevel,
} from '../entities/accessibility-log.entity';

export interface AccessibilityEvent {
  eventType: AccessibilityEventType;
  severityLevel: SeverityLevel;
  title: string;
  description: string;
  wcagGuideline?: string;
  wcagLevel?: WcagLevel;
  ruleId?: string;
  elementSelector?: string;
  pageUrl?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  assistiveTechnology?: string;
  contextData?: Record<string, any>;
  browserInfo?: {
    name: string;
    version: string;
    platform: string;
    mobile: boolean;
  };
  viewportInfo?: {
    width: number;
    height: number;
  };
}
