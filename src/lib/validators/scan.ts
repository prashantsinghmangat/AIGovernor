import { z } from 'zod';

export const triggerScanSchema = z.object({
  repository_id: z.string().uuid().optional(),
  scan_type: z.enum(['full', 'incremental']),
  scan_from: z.string().datetime().optional(),
  scan_to: z.string().datetime().optional(),
});

export type TriggerScanInput = z.infer<typeof triggerScanSchema>;
