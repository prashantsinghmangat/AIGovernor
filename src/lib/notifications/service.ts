import { createAdminSupabase } from '@/lib/supabase/admin';
import type {
  NotificationPayload,
  NotificationSettings,
  NotificationEvent,
  SlackConfig,
  WebhookConfig,
  EmailConfig,
} from './types';
import type { Json } from '@/types/database';

/**
 * Map notification events to setting fields
 */
const EVENT_TO_SETTING: Record<NotificationEvent, keyof NotificationSettings> = {
  scan_complete: 'on_scan_complete',
  critical_vulnerability: 'on_critical_vulnerability',
  high_vulnerability: 'on_high_vulnerability',
  pii_detected: 'on_pii_detected',
  debt_score_drop: 'on_debt_score_drop',
  pr_analysis: 'on_pr_analysis',
};

/**
 * Send a notification to all configured channels for a company.
 * Checks notification preferences before sending.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const admin = createAdminSupabase();

  // Fetch all enabled notification settings for this company
  const { data: settings } = await admin
    .from('notification_settings')
    .select('*')
    .eq('company_id', payload.company_id)
    .eq('enabled', true);

  if (!settings || settings.length === 0) return;

  for (const setting of settings) {
    const ns = setting as unknown as NotificationSettings;

    // Check if this event type is enabled for this channel
    const settingKey = EVENT_TO_SETTING[payload.event];
    if (settingKey && !ns[settingKey]) continue;

    try {
      switch (ns.channel) {
        case 'slack':
          await sendSlackNotification(ns.config as SlackConfig, payload);
          break;
        case 'webhook':
          await sendWebhookNotification(ns.config as WebhookConfig, payload);
          break;
        case 'email':
          await sendEmailNotification(ns.config as EmailConfig, payload);
          break;
        case 'in_app':
          // In-app notifications are handled by alerts table — already created by scan pipeline
          break;
      }

      // Log success
      await admin.from('notification_log').insert({
        company_id: payload.company_id,
        channel: ns.channel,
        event_type: payload.event,
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata as unknown as Json,
        status: 'sent',
      });

    } catch (err) {
      console.error(`[Notifications] Failed to send ${ns.channel} notification:`, err instanceof Error ? err.message : err);

      // Log failure
      await admin.from('notification_log').insert({
        company_id: payload.company_id,
        channel: ns.channel,
        event_type: payload.event,
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata as unknown as Json,
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}

/**
 * Send a Slack notification via incoming webhook
 */
async function sendSlackNotification(config: SlackConfig, payload: NotificationPayload): Promise<void> {
  if (!config.webhook_url) throw new Error('Slack webhook URL not configured');

  const severityEmoji: Record<string, string> = {
    critical: ':red_circle:',
    high: ':large_orange_circle:',
    medium: ':large_yellow_circle:',
    info: ':large_blue_circle:',
  };

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: payload.title },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${severityEmoji[payload.severity] || ':white_circle:'} *${payload.severity.toUpperCase()}*\n\n${payload.body}`,
      },
    },
  ];

  if (payload.metadata.repository) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Repository:* ${payload.metadata.repository}`,
      },
    });
  }

  if (payload.metadata.url) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${payload.metadata.url}|View in CodeGuard AI>`,
      },
    });
  }

  const response = await fetch(config.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: config.channel,
      blocks,
      text: payload.title, // Fallback text
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook returned ${response.status}: ${await response.text()}`);
  }
}

/**
 * Send a webhook notification to an external URL
 */
async function sendWebhookNotification(config: WebhookConfig, payload: NotificationPayload): Promise<void> {
  if (!config.url) throw new Error('Webhook URL not configured');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-CodeGuard-Event': payload.event,
    ...config.headers,
  };

  // Add HMAC signature if secret is configured
  if (config.secret) {
    const crypto = await import('crypto');
    const body = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', config.secret);
    hmac.update(body);
    headers['X-CodeGuard-Signature'] = `sha256=${hmac.digest('hex')}`;
  }

  const response = await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      event: payload.event,
      severity: payload.severity,
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }
}

/**
 * Send an email notification.
 * Currently a stub — implement with your email provider (Resend, SendGrid, etc.)
 */
async function sendEmailNotification(config: EmailConfig, payload: NotificationPayload): Promise<void> {
  if (!config.recipients || config.recipients.length === 0) {
    throw new Error('No email recipients configured');
  }

  // TODO: Integrate with email provider (Resend, SendGrid, AWS SES)
  // For now, log the notification
  console.log(
    `[Notifications] Email notification to ${config.recipients.join(', ')}:`,
    payload.title,
  );
}

/**
 * Helper: Send scan completion notification
 */
export async function notifyScanComplete(
  companyId: string,
  repoFullName: string,
  scanId: string,
  summary: {
    total_files: number;
    vulnerabilities: { critical: number; high: number; total: number };
    debt_score: number;
    ai_loc_percentage: number;
  },
): Promise<void> {
  const parts: string[] = [
    `Scanned ${summary.total_files} files`,
    `Debt Score: ${summary.debt_score}/100`,
    `AI Code: ${summary.ai_loc_percentage}%`,
  ];

  if (summary.vulnerabilities.total > 0) {
    parts.push(`Vulnerabilities: ${summary.vulnerabilities.total} (${summary.vulnerabilities.critical} critical, ${summary.vulnerabilities.high} high)`);
  }

  await sendNotification({
    event: 'scan_complete',
    company_id: companyId,
    title: `Scan Complete: ${repoFullName}`,
    body: parts.join(' • '),
    severity: summary.vulnerabilities.critical > 0 ? 'critical' :
      summary.vulnerabilities.high > 0 ? 'high' : 'info',
    metadata: {
      repository: repoFullName,
      scan_id: scanId,
      score: summary.debt_score,
    },
  });

  // Send specific vulnerability notifications
  if (summary.vulnerabilities.critical > 0) {
    await sendNotification({
      event: 'critical_vulnerability',
      company_id: companyId,
      title: `Critical Vulnerabilities: ${repoFullName}`,
      body: `${summary.vulnerabilities.critical} critical vulnerability finding(s) detected. Immediate remediation required.`,
      severity: 'critical',
      metadata: { repository: repoFullName, scan_id: scanId },
    });
  }
}

/**
 * Helper: Send PR analysis notification
 */
export async function notifyPRAnalysis(
  companyId: string,
  repoFullName: string,
  prNumber: number,
  prTitle: string,
  summary: {
    vulnerabilities_total: number;
    ai_loc_percentage: number;
    pii_findings: number;
  },
): Promise<void> {
  const parts: string[] = [];
  if (summary.vulnerabilities_total > 0) parts.push(`${summary.vulnerabilities_total} vulnerabilities`);
  if (summary.ai_loc_percentage > 30) parts.push(`${summary.ai_loc_percentage}% AI code`);
  if (summary.pii_findings > 0) parts.push(`${summary.pii_findings} PII findings`);

  if (parts.length === 0) parts.push('No issues found');

  await sendNotification({
    event: 'pr_analysis',
    company_id: companyId,
    title: `PR #${prNumber} Analyzed: ${prTitle}`,
    body: `${repoFullName} — ${parts.join(', ')}`,
    severity: summary.vulnerabilities_total > 0 ? 'high' : 'info',
    metadata: { repository: repoFullName, pr_number: prNumber },
  });
}
