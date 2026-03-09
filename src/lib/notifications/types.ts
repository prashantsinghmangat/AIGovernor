export type NotificationChannel = 'slack' | 'email' | 'webhook' | 'in_app';

export type NotificationEvent =
  | 'scan_complete'
  | 'critical_vulnerability'
  | 'high_vulnerability'
  | 'pii_detected'
  | 'debt_score_drop'
  | 'pr_analysis';

export interface NotificationPayload {
  event: NotificationEvent;
  company_id: string;
  title: string;
  body: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  metadata: {
    repository?: string;
    scan_id?: string;
    pr_number?: number;
    score?: number;
    url?: string;
    [key: string]: unknown;
  };
}

export interface NotificationSettings {
  id: string;
  company_id: string;
  channel: NotificationChannel;
  enabled: boolean;
  config: SlackConfig | EmailConfig | WebhookConfig | Record<string, never>;
  on_scan_complete: boolean;
  on_critical_vulnerability: boolean;
  on_high_vulnerability: boolean;
  on_pii_detected: boolean;
  on_debt_score_drop: boolean;
  on_pr_analysis: boolean;
}

export interface SlackConfig {
  webhook_url: string;
  channel?: string;
}

export interface EmailConfig {
  recipients: string[];
  from_name?: string;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
}
