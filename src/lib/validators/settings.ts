import { z } from 'zod';

export const companySettingsSchema = z.object({
  name: z.string().min(2).optional(),
  settings: z.object({
    scoring_sensitivity: z.enum(['low', 'medium', 'high']).optional(),
    risk_threshold: z.number().min(0).max(100).optional(),
    notification_frequency: z.enum(['realtime', 'daily', 'weekly']).optional(),
    ai_merge_blocking: z.boolean().optional(),
    auto_scan_enabled: z.boolean().optional(),
    scan_interval_hours: z.number().min(1).max(168).optional(),
  }).optional(),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
