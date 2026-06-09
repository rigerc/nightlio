import { z } from 'zod';

export const moodIconsRequestSchema = z.object({
  icons: z.record(z.string(), z.string()),
});

export const timeFormatRequestSchema = z.object({
  use_24_hour_time: z.boolean(),
});

export type MoodIconsInput = z.infer<typeof moodIconsRequestSchema>;
export type TimeFormatInput = z.infer<typeof timeFormatRequestSchema>;
